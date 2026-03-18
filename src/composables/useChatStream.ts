import { ref } from 'vue'
import { loadAppConfig } from '@/config'
import { InstrumentedOpenAICompatibleClient } from '@/monitoring/instrumentedClient'
import { STREAM_CONTINUE_PROMPT } from '@/prompts/streamContinuation'
import { useChatStore } from '@/stores/chat'
import type { ChatMessage, ContextItem } from '@/types/chat'
import type { ChatCompletionChunk, ChatCompletionsCreateParams } from '@/services/openai-like/types'
import { trimContext } from '@/utils/context'

export function useChatStream() {
  const chat = useChatStore()
  const isLoading = ref(false)

  let currentController: AbortController | null = null
  let curMessage: ChatMessage | null = null

  const { config, errors: configErrors } = loadAppConfig()
  const openai = new InstrumentedOpenAICompatibleClient({
    apiKey: config.openaiCompat.apiKey,
    baseURL: config.openaiCompat.baseURL,
    timeoutMs: config.openaiCompat.timeoutMs,
    retries: config.openaiCompat.retries,
  })

  const model = config.openaiCompat.model
  const maxMessages = config.context.maxMessages
  const maxChars = config.context.maxChars

  function stop() {
    if (!currentController) return
    if (curMessage) {
      curMessage.status = 'interrupted'
      curMessage.error = undefined
      void chat.updateMessage(curMessage)
    }
    currentController.abort()
  }

  function toErrorText(err: unknown) {
    if (err instanceof Error) return err.message
    try {
      return JSON.stringify(err)
    } catch {
      return String(err)
    }
  }

  function isAbortError(err: unknown) {
    return err instanceof DOMException && err.name === 'AbortError'
  }

  function extractDelta(chunk: ChatCompletionChunk) {
    return chunk?.choices?.[0]?.delta?.content ?? ''
  }

  function trimMessages(messages: ContextItem[]) {
    return trimContext(messages, { maxMessages, maxChars, keepPairs: true })
  }

  function createBaseContext(message: ChatMessage) {
    return trimMessages(
      chat.currentMessages
        .filter((item) => item.id !== message.id)
        .map((item) => ({ role: item.role, content: item.content })),
    )
  }

  function buildContinuationContext(base: ContextItem[], assistantContent: string) {
    return trimMessages([
      ...base,
      { role: 'assistant', content: assistantContent },
      { role: 'user', content: STREAM_CONTINUE_PROMPT },
    ])
  }

  async function updateMessage(
    message: ChatMessage,
    mutate: (message: ChatMessage) => void,
    persistSession = true,
  ) {
    mutate(message)
    await chat.updateMessage(message, { persistSession })
  }

  function createRafDeltaBuffer(message: ChatMessage, sessionId: string) {
    let pending = ''
    let rafId: number | null = null
    let closed = false
    let appendChain: Promise<unknown> = Promise.resolve()

    const raf: (cb: FrameRequestCallback) => number = window.requestAnimationFrame
      ? window.requestAnimationFrame.bind(window)
      : (cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16)
    const caf: (id: number) => void = window.cancelAnimationFrame
      ? window.cancelAnimationFrame.bind(window)
      : (id: number) => window.clearTimeout(id)

    function enqueue(delta: string) {
      if (chat.currentId !== sessionId) return
      appendChain = appendChain.then(() =>
        updateMessage(
          message,
          (target) => {
            target.content += delta
          },
          false,
        ),
      )
    }

    function flushPending() {
      if (closed || !pending) return
      const delta = pending
      pending = ''
      enqueue(delta)
    }

    return {
      push(delta: string) {
        if (closed) return
        pending += delta
        if (rafId != null) return
        rafId = raf(() => {
          rafId = null
          flushPending()
        })
      },
      async close() {
        if (rafId != null) {
          caf(rafId)
          rafId = null
        }
        flushPending()
        await appendChain
        closed = true
      },
    }
  }

  async function markInterrupted(message: ChatMessage) {
    await updateMessage(message, (target) => {
      target.status = 'interrupted'
      target.error = undefined
    })
  }

  async function runStream(message: ChatMessage, messages: ContextItem[]) {
    const sessionId = message.sessionId
    curMessage = message
    currentController = new AbortController()
    isLoading.value = true

    const buffer = createRafDeltaBuffer(message, sessionId)
    let hasDelta = false

    try {
      const params: ChatCompletionsCreateParams = {
        model,
        messages,
        stream: true,
        stream_options: { include_usage: true },
      }

      const completion = openai.chat.completions.create({
        ...params,
        signal: currentController.signal,
      })

      for await (const chunk of completion) {
        if (chat.currentId !== sessionId) return

        const delta = extractDelta(chunk)
        if (!delta) continue

        hasDelta = true
        buffer.push(delta)
      }

      if (chat.currentId !== sessionId) return
      await buffer.close()
      await updateMessage(message, (target) => {
        target.status = 'done'
        target.error = undefined
      })
    } catch (err) {
      if (chat.currentId !== sessionId) return
      await buffer.close()

      if (isAbortError(err) && curMessage?.id === message.id && curMessage.status === 'interrupted') {
        if (hasDelta) {
          await markInterrupted(message)
        } else {
          await updateMessage(message, (target) => {
            target.status = 'error'
            target.error = 'Cancelled'
          })
        }
        return
      }

      if (hasDelta) {
        await markInterrupted(message)
      } else {
        await updateMessage(message, (target) => {
          target.status = 'error'
          target.error = toErrorText(err)
        })
      }
    } finally {
      isLoading.value = false
      currentController = null
      await buffer.close()
      if (curMessage?.id === message.id) {
        curMessage = null
      }
    }
  }

  async function send(text: string) {
    if (isLoading.value) stop()

    await chat.addUserMessage(text)
    const assistant = await chat.addAssistantMessage('')

    if (configErrors.length > 0) {
      await updateMessage(assistant, (message) => {
        message.status = 'error'
        message.error =
          'Configuration invalid:\n' +
          configErrors.map((item) => `- ${item}`).join('\n') +
          '\n\nPlease create .env.local from env.example.txt and fill VITE_* values.'
      })
      return
    }

    await runStream(assistant, createBaseContext(assistant))
  }

  async function retry() {
    if (isLoading.value) stop()

    const assistant = chat.getLastAssistantMessage()
    if (!assistant) return
    if (assistant.status !== 'error') return

    const baseContext = createBaseContext(assistant)
    await updateMessage(assistant, (message) => {
      message.content = ''
      message.status = 'streaming'
      message.error = undefined
    })
    await runStream(assistant, baseContext)
  }

  async function resume() {
    if (isLoading.value) stop()

    const assistant = chat.getLastAssistantMessage()
    if (!assistant) return
    if (assistant.status !== 'interrupted') return

    const baseContext = createBaseContext(assistant)
    const messages =
      assistant.content.length > 0
        ? buildContinuationContext(baseContext, assistant.content)
        : baseContext

    await updateMessage(assistant, (message) => {
      message.status = 'streaming'
      message.error = undefined
    })
    await runStream(assistant, messages)
  }

  return {
    isLoading,
    send,
    retry,
    resume,
    stop,
  }
}

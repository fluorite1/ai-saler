import { ref } from 'vue'
import type { ContextItem } from '@/types/chat'
import { useChatStore } from '@/stores/chat'
import { trimContext } from '@/utils/context'
import { loadAppConfig } from '@/config'

// 使用 OpenAI-compatible client
import { OpenAICompatibleClient } from '@/services/openai-like/client'
import type { ChatCompletionChunk, ChatCompletionsCreateParams } from '@/services/openai-like/types'

export function useChatStream() {
  const chat = useChatStore()
  const isLoading = ref(false)
  let currentController: AbortController | null = null
  let currentReqId = 0
  let cancelledReqId: number | null = null
  let reqSeq = 0

  // 保存每条 assistant 对应的一次请求上下文，用于重试（裁剪后的快照）
  const contexts = new Map<string, { sessionId: string; messages: ContextItem[] }>()

  let inflightSessionId: string | null = null

  const { config, errors: configErrors } = loadAppConfig()
  // OpenAI-compatible 初始化
  const openai = new OpenAICompatibleClient({
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
    cancelledReqId = currentReqId
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

  function extractDelta(chunk: ChatCompletionChunk): string {
    // OpenAI chat.completions stream: choices[0].delta.content
    return chunk?.choices?.[0]?.delta?.content ?? ''
  }

  function isAbortError(err: unknown) {
    return err instanceof DOMException && err.name === 'AbortError'
  }

  /**
   * Buffer streaming deltas and flush at most once per animation frame,
   * to reduce reactive updates and redundant re-renders.
   */
  function createRafDeltaBuffer(assistantId: string, sessionId: string) {
    let pending = ''
    let rafId: number | null = null
    let closed = false

    const raf =
      window.requestAnimationFrame ??
      ((cb: FrameRequestCallback) => window.setTimeout(() => cb(performance.now()), 16) as any)
    const caf = window.cancelAnimationFrame ?? ((id: number) => window.clearTimeout(id))

    function safeAppend(delta: string) {
      // session switch protection (same as runStream guard)
      if (chat.currentId !== sessionId) return
      chat.appendToMessage(assistantId, delta)
    }

    function flushNow() {
      if (closed) return
      if (!pending) return
      const delta = pending
      pending = ''
      safeAppend(delta)
    }

    function schedule() {
      if (closed) return
      if (rafId != null) return
      rafId = raf(() => {
        rafId = null
        flushNow()
      })
    }

    return {
      push(delta: string) {
        if (closed) return
        pending += delta
        schedule()
      },
      flush() {
        if (rafId != null) {
          caf(rafId)
          rafId = null
        }
        flushNow()
      },
      close() {
        this.flush()
        closed = true
      },
    }
  }

  async function runStream(assistantId: string, sessionId: string, messages: ContextItem[]) {
    const reqId = ++reqSeq
    currentReqId = reqId
    isLoading.value = true
    currentController = new AbortController()
    inflightSessionId = sessionId
    const buffer = createRafDeltaBuffer(assistantId, sessionId)

    try {
      const params: ChatCompletionsCreateParams = {
        model,
        messages: messages,
        stream: true,
        stream_options: { include_usage: true },
      }

      const completion = openai.chat.completions.create({
        ...params,
        signal: currentController.signal,
      })

      for await (const chunk of completion) {
        // 切会话保护
        if (chat.currentId !== inflightSessionId) return

        const delta = extractDelta(chunk)
        if (delta) buffer.push(delta)

        // 可选：usage（通常最后一个 chunk 才有）
        // if (chunk.usage) console.log('usage:', chunk.usage)
      }

      // 正常结束
      if (chat.currentId !== inflightSessionId) return
      buffer.close()
      chat.updateMessage(assistantId, { status: 'done', error: undefined })
      chat.flushStorage?.()
      contexts.delete(assistantId)
    } catch (err) {
      // 用户 stop: AbortError 视为“停止生成”，不标 error，保留 retry 上下文
      if (isAbortError(err) && cancelledReqId === reqId) {
        if (chat.currentId !== inflightSessionId) return
        buffer.close()
        chat.updateMessage(assistantId, { status: 'done', error: undefined })
        chat.flushStorage?.()
        return
      }

      if (chat.currentId !== inflightSessionId) return
      buffer.close()
      chat.updateMessage(assistantId, { status: 'error', error: toErrorText(err) })
      chat.flushStorage?.()
    } finally {
      isLoading.value = false
      currentController = null
      inflightSessionId = null
      if (cancelledReqId === reqId) cancelledReqId = null
      buffer.close()
    }
  }

  async function send(text: string) {
    if (isLoading.value) stop()

    const sessionId = chat.currentId

    chat.addUserMessage(text)
    const assistant = chat.addAssistantMessage('')

    if (configErrors.length > 0) {
      chat.updateMessage(assistant.id, {
        status: 'error',
        error:
          '配置缺失/不合法：\n' +
          configErrors.map((e) => `- ${e}`).join('\n') +
          '\n\n请按 env.example.txt 创建 .env.local 并填写相关 VITE_* 变量。',
      })
      chat.flushStorage?.()
      return
    }

    const raw: ContextItem[] = chat.currentMessages
      .filter((m) => m.id !== assistant.id)
      .map((m) => ({ role: m.role, content: m.content }))

    const messages = trimContext(raw, {
      maxMessages,
      maxChars,
      keepPairs: true,
    })

    contexts.set(assistant.id, { sessionId, messages })
    await runStream(assistant.id, sessionId, messages)
  }

  async function retry(assistantId: string) {
    const ctx = contexts.get(assistantId)
    if (!ctx) return

    if (isLoading.value) stop()

    if (chat.currentId !== ctx.sessionId) {
      chat.switchSession(ctx.sessionId)
    }

    chat.resetMessageForRetry(assistantId)
    await runStream(assistantId, ctx.sessionId, ctx.messages)
  }

  return {
    isLoading,
    send,
    retry,
    stop,
  }
}

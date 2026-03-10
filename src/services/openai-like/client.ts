import { withRetry } from '@/utils/retry'
import type { ChatCompletionsCreateParams, ChatCompletionChunk } from './types'
import { sseLines } from './sse'

export type OpenAICompatibleClientOptions = {
  apiKey: string
  baseURL: string
  timeoutMs?: number
  retries?: number
}

function isAbortError(err: unknown) {
  return err instanceof DOMException && err.name === 'AbortError'
}

function getStatus(err: unknown): number | undefined {
  if (typeof err !== 'object' || err == null) return undefined
  const v = (err as { status?: unknown }).status
  return typeof v === 'number' ? v : undefined
}

function shouldRetry(err: unknown) {
  // Abort（用户取消/超时）不重试
  if (isAbortError(err)) return false

  const status = getStatus(err)
  // 4xx 通常不重试（鉴权/参数）
  if (typeof status === 'number' && status >= 400 && status < 500) return false

  // 其它情况（网络错误/5xx）重试
  return true
}

export class OpenAICompatibleClient {
  private apiKey: string
  private baseURL: string
  private timeoutMs: number
  private retries: number

  constructor(opts: OpenAICompatibleClientOptions) {
    this.apiKey = opts.apiKey
    this.baseURL = opts.baseURL.replace(/\/+$/, '')
    this.timeoutMs = opts.timeoutMs ?? 20000
    this.retries = opts.retries ?? 2
  }

  chat = {
    completions: {
      create: (params: ChatCompletionsCreateParams) => this.createChatCompletion(params),
    },
  }

  private async *createChatCompletion(
    params: ChatCompletionsCreateParams,
  ): AsyncGenerator<ChatCompletionChunk> {
    if (!params.stream) {
      throw new Error('This client currently implements stream=true only.')
    }

    // 用 retry 包住 “建立请求 + 拿到 response.body” 的过程
    const { res, controller, cleanup } = await withRetry(async () => this.openStream(params), {
      retries: this.retries,
      shouldRetry,
    })

    try {
      for await (const data of sseLines(res.body!, controller.signal)) {
        if (data === '[DONE]') return

        let chunk: ChatCompletionChunk
        try {
          chunk = JSON.parse(data)
        } catch {
          // 兼容 provider 的非 JSON data 行
          continue
        }

        yield chunk
      }
    } finally {
      cleanup?.()
    }
  }

  /**
   * 建立到 /chat/completions 的 SSE 连接（只负责拿到 Response + 可用 body）
   * 支持外部 signal
   * 支持 timeout
   * 对非 2xx 抛错并携带 status
   */
  private async openStream(params: ChatCompletionsCreateParams): Promise<{
    res: Response
    controller: AbortController
    cleanup: () => void
  }> {
    const controller = new AbortController()

    // 联动外部 signal
    const external = params.signal
    const abort = () => controller.abort()
    if (external) {
      if (external.aborted) abort()
      else external.addEventListener('abort', abort)
    }
    const cleanup = () => {
      if (external) external.removeEventListener('abort', abort)
    }

    // 超时 abort
    const timer = window.setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const res = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          ...params,
          stream: true,
          // signal 是 fetch 的 option，不要进 body
          signal: undefined,
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`)
        ;(err as Error & { status?: number }).status = res.status
        throw err
      }

      if (!res.body) {
        const err = new Error('No response body(stream)')
        ;(err as Error & { status?: number }).status = 0
        throw err
      }

      return { res, controller, cleanup }
    } finally {
      clearTimeout(timer)
    }
  }
}

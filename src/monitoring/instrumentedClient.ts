import { createStreamMetricsProxy } from './streamMetricsProxy'
import { loadAppConfig } from '@/config'
import { OpenAICompatibleClient, type OpenAICompatibleClientOptions } from '@/services/openai-like/client'
import type { ChatCompletionsCreateParams, ChatCompletionChunk } from '@/services/openai-like/types'

export class InstrumentedOpenAICompatibleClient extends OpenAICompatibleClient {
  constructor(opts: OpenAICompatibleClientOptions) {
    super(opts)
    const { config } = loadAppConfig()
    const topK = config.monitoring.streamTopK

    const baseCreate = this.chat.completions.create
    this.chat = {
      ...this.chat,
      completions: {
        ...this.chat.completions,
        create: (params: ChatCompletionsCreateParams): AsyncGenerator<ChatCompletionChunk> => {
          const source = baseCreate(params)
          return createStreamMetricsProxy(source, { topK })
        },
      },
    }
  }
}


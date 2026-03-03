export type ChatCompletionRole = 'system' | 'user' | 'assistant' | 'tool'

export type ChatCompletionMessageParam = {
  role: ChatCompletionRole
  content: string
}

export type ChatCompletionsCreateParams = {
  model: string
  messages: ChatCompletionMessageParam[]
  stream?: boolean
  stream_options?: { include_usage?: boolean }
  temperature?: number
  top_p?: number
  max_tokens?: number
  signal?: AbortSignal
}

export type ChatCompletionChunk = {
  id?: string
  object?: string
  created?: number
  model?: string
  choices: Array<{
    index: number
    delta: { role?: string; content?: string }
    finish_reason?: string | null
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export type Role = 'system' | 'user' | 'assistant'
export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error' | 'interrupted'

export type ChatMessage = {
  id: string
  role: Role
  content: string
  createdAt: number
  status?: MessageStatus
  error?: string
}

export type ChatSession = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export type SessionsPersistedV2 = {
  version: 2
  sessions: ChatSession[]
}

export type ContextItem = Pick<ChatMessage, 'role' | 'content'>

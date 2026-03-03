export type Role = 'system' | 'user' | 'assistant'
export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error'

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

export type SessionsPersistedV1 = {
  version: 1
  currentId: string
  sessions: ChatSession[]
}

export type ContextItem = Pick<ChatMessage, 'role' | 'content'>

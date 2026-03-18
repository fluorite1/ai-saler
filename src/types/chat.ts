export type Role = 'user' | 'assistant'
export type MessageStatus = 'streaming' | 'done' | 'error' | 'interrupted'

export type ChatMessage = {
  id: string
  sessionId: string
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

export type ContextItem = Pick<ChatMessage, 'role' | 'content'>

import Dexie, { type EntityTable } from 'dexie'
import type { ChatMessage, ChatSession } from '@/types/chat'

export type MessageRecord = ChatMessage & {
  sessionId: string
}

type ChatDB = Dexie & {
  sessions: EntityTable<ChatSession, 'id'>
  messages: EntityTable<MessageRecord, 'id'>
}

export const chatDb = new Dexie('aiSalerDB') as ChatDB

chatDb.version(1).stores({
  sessions: 'id, updatedAt, createdAt',
  messages: 'id, sessionId, [sessionId+createdAt], status',
})

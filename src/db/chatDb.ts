import Dexie, { type EntityTable } from 'dexie'
import type { ChatMessage, ChatSession } from '@/types/chat'

type ChatDB = Dexie & {
  sessions: EntityTable<ChatSession, 'id'>
  messages: EntityTable<ChatMessage, 'id'>
}

export const chatDb = new Dexie('aiSalerDB') as ChatDB

chatDb.version(1).stores({
  sessions: 'id, updatedAt, createdAt',
  messages: 'id, sessionId, [sessionId+createdAt], status',
})

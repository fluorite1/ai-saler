import Dexie from 'dexie'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ChatMessage, ChatSession } from '@/types/chat'
import { chatDb, type MessageRecord } from '@/db/chatDb'

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

const now = () => Date.now()

function createSessionMeta(title = 'New Chat'): ChatSession {
  const t = now()
  return { id: uid(), title, createdAt: t, updatedAt: t }
}

export const useChatStore = defineStore('chat', () => {
  const s = createSessionMeta()
  const sessions = ref<ChatSession[]>([s])
  const currentMessages = ref<ChatMessage[]>([])

  const currentId = computed(() => sessions.value[0]?.id ?? '')
  const currentSession = computed<ChatSession>(() => sessions.value[0]!)

  async function persistSessions() {
    await chatDb.sessions.bulkPut(sessions.value)
  }

  async function loadSessions() {
    const rows = await chatDb.sessions.orderBy('updatedAt').reverse().toArray()
    if (rows.length === 0) {
      const first = createSessionMeta()
      sessions.value = [first]
      await chatDb.sessions.put(first)
      return
    }
    sessions.value = rows
  }

  async function loadMessagesBySessionId(sessionId: string): Promise<ChatMessage[]> {
    if (!sessionId) return []
    const rows = await chatDb.messages
      .where('[sessionId+createdAt]')
      .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
      .toArray()
    return rows.map(({ sessionId: _sessionId, ...message }) => message)
  }

  async function loadMessages() {
    currentMessages.value = await loadMessagesBySessionId(currentId.value)
  }

  async function persistMessages(sessionId: string, messages: ChatMessage[]) {
    const rows: MessageRecord[] = messages.map((m) => ({ ...m, sessionId }))
    await chatDb.transaction('rw', chatDb.messages, async () => {
      await chatDb.messages.where('sessionId').equals(sessionId).delete()
      if (rows.length > 0) await chatDb.messages.bulkPut(rows)
    })
  }

  async function saveCurrentMessages() {
    if (!currentId.value) return
    await persistMessages(currentId.value, currentMessages.value)
  }

  async function initFromDB() {
    await loadSessions()
    await loadMessages()
  }

  async function switchSession(index: number) {
    if (index === 0) return
    if (index < 0 || index >= sessions.value.length) return

    await flushStorage()
    const [target] = sessions.value.splice(index, 1)
    if (!target) return
    target.updatedAt = now()
    sessions.value.unshift(target)
    await persistSessions()
    await loadMessages()
  }

  async function createSession(title = 'New Chat') {
    await flushStorage()

    const meta = createSessionMeta(title.trim() || 'New Chat')
    sessions.value.unshift(meta)
    currentMessages.value = []
    await chatDb.sessions.put(meta)
    return meta.id
  }

  async function renameSession(id: string, title: string) {
    const s = sessions.value.find((x) => x.id === id)
    if (!s) return
    s.title = title.trim() || s.title
    s.updatedAt = now()
    await persistSessions()
  }

  async function deleteSession(id: string) {
    if (!sessions.value.some((x) => x.id === id)) return

    await flushStorage()
    await chatDb.transaction('rw', chatDb.sessions, chatDb.messages, async () => {
      await chatDb.sessions.delete(id)
      await chatDb.messages.where('sessionId').equals(id).delete()
    })

    sessions.value = sessions.value.filter((x) => x.id !== id)
    if (sessions.value.length === 0) {
      const meta = createSessionMeta()
      sessions.value = [meta]
      await chatDb.sessions.put(meta)
    }
    await loadMessages()
  }

  function addUserMessage(content: string) {
    const msg: ChatMessage = {
      id: uid(),
      role: 'user',
      content,
      createdAt: now(),
      status: 'done',
    }
    currentMessages.value.push(msg)
    currentSession.value.updatedAt = now()
    return msg
  }

  function addAssistantMessage(initial = '') {
    const msg: ChatMessage = {
      id: uid(),
      role: 'assistant',
      content: initial,
      createdAt: now(),
      status: 'streaming',
    }
    currentMessages.value.push(msg)
    currentSession.value.updatedAt = now()
    return msg
  }

  function updateMessage(id: string, patch: Partial<ChatMessage>) {
    const target = currentMessages.value.find((m) => m.id === id)
    if (target) Object.assign(target, patch)
    currentSession.value.updatedAt = now()
  }

  function appendToMessage(id: string, delta: string) {
    const target = currentMessages.value.find((m) => m.id === id)
    if (target) target.content += delta
    currentSession.value.updatedAt = now()
  }

  function resetMessageForRetry(id: string) {
    const target = currentMessages.value.find((m) => m.id === id)
    if (!target) return
    target.content = ''
    target.status = 'streaming'
    target.error = undefined
    currentSession.value.updatedAt = now()
  }

  async function flushStorage() {
    if (!currentId.value) return
    await persistSessions()
    await saveCurrentMessages()
  }

  return {
    currentId,
    sessions,
    currentMessages,
    currentSession,
    persistSessions,
    loadSessions,
    saveCurrentMessages,
    loadMessages,
    initFromDB,
    switchSession,
    createSession,
    renameSession,
    deleteSession,
    addUserMessage,
    addAssistantMessage,
    updateMessage,
    appendToMessage,
    resetMessageForRetry,
    flushStorage,
  }
})

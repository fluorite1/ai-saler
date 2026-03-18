import { defineStore } from 'pinia'
import { computed, reactive, ref, toRaw } from 'vue'
import { chatDb } from '@/db/chatDb'
import type { ChatMessage, ChatSession, MessageStatus } from '@/types/chat'

type UpdateMessageOptions = {
  persistSession?: boolean
}

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}

const now = () => Date.now()

function toPlain<T extends ChatMessage | ChatSession>(value: T): T {
  return toRaw(value)
}

function createSession(title = 'New Chat'): ChatSession {
  const timestamp = now()
  return reactive({
    id: uid(),
    title,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
}

function createMessage(
  sessionId: string,
  role: ChatMessage['role'],
  content: string,
  status: MessageStatus,
): ChatMessage {
  return reactive({
    id: uid(),
    sessionId,
    role,
    content,
    createdAt: now(),
    status,
  })
}

export const useChatStore = defineStore('chat', () => {
  const sessions = ref<ChatSession[]>([])
  const currentMessages = ref<ChatMessage[]>([])

  const currentId = computed(() => sessions.value[0]?.id ?? '')
  const currentSession = computed<ChatSession>(() => sessions.value[0]!)

  async function persistSession(session: ChatSession) {
    await chatDb.sessions.put(toPlain(session))
  }

  async function persistMessage(message: ChatMessage) {
    await chatDb.messages.put(toPlain(message))
  }

  async function touchCurrentSession(persist = true) {
    if (!currentId.value) return
    currentSession.value.updatedAt = now()
    if (persist) {
      await persistSession(currentSession.value)
    }
  }

  async function loadSessions() {
    const items = await chatDb.sessions.orderBy('updatedAt').reverse().toArray()
    if (items.length > 0) {
      sessions.value = items
      return
    }

    const first = createSession()
    await persistSession(first)
    sessions.value = [first]
  }

  async function loadMessages(sessionId = currentId.value) {
    currentMessages.value = sessionId
      ? await chatDb.messages.where('sessionId').equals(sessionId).sortBy('createdAt')
      : []
  }

  async function initFromDB() {
    await loadSessions()
    await loadMessages()
  }

  async function switchSession(index: number) {
    if (index <= 0 || index >= sessions.value.length) return

    const [target] = sessions.value.splice(index, 1)
    if (!target) return
    target.updatedAt = now()
    sessions.value.unshift(target)
    await persistSession(target)
    await loadMessages()
  }

  async function createSessionEntry(title = 'New Chat') {
    const session = createSession(title.trim() || 'New Chat')
    await persistSession(session)
    sessions.value.unshift(session)
    currentMessages.value = []
    return session.id
  }

  async function renameSession(id: string, title: string) {
    const session = sessions.value.find((item) => item.id === id)
    if (!session) return
    session.title = title.trim() || session.title
    session.updatedAt = now()
    await persistSession(session)
  }

  async function deleteSession(id: string) {
    if (!sessions.value.some((item) => item.id === id)) return

    await chatDb.transaction('rw', chatDb.sessions, chatDb.messages, async () => {
      await chatDb.sessions.delete(id)
      await chatDb.messages.where('sessionId').equals(id).delete()
    })

    sessions.value = sessions.value.filter((item) => item.id !== id)
    if (sessions.value.length === 0) {
      const session = createSession()
      await persistSession(session)
      sessions.value = [session]
    }
    await loadMessages()
  }

  async function addMessage(role: ChatMessage['role'], content: string, status: MessageStatus) {
    const message = createMessage(currentId.value, role, content, status)
    await persistMessage(message)
    currentMessages.value.push(message)
    await touchCurrentSession()
    return message
  }

  async function addUserMessage(content: string) {
    return addMessage('user', content, 'done')
  }

  async function addAssistantMessage(initial = '') {
    return addMessage('assistant', initial, 'streaming')
  }

  async function updateMessage(message: ChatMessage, opt?: UpdateMessageOptions) {
    await persistMessage(message)
    await touchCurrentSession(opt?.persistSession ?? true)
  }

  async function flushStorage() {
    if (!currentId.value) return
    await persistSession(currentSession.value)
  }

  function getLastAssistantMessage() {
    const last = currentMessages.value[currentMessages.value.length - 1]
    if (!last) return null
    return last.role === 'assistant' ? last : null
  }

  return {
    currentId,
    sessions,
    currentMessages,
    currentSession,
    loadSessions,
    loadMessages,
    initFromDB,
    switchSession,
    createSession: createSessionEntry,
    renameSession,
    deleteSession,
    addUserMessage,
    addAssistantMessage,
    updateMessage,
    flushStorage,
    getLastAssistantMessage,
  }
})

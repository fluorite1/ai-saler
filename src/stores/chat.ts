import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ChatMessage, ChatSession, SessionsPersistedV1 } from '@/types/chat'
import { loadJSON, saveJSON, remove, STORAGE_KEYS } from '@/utils/storage'
import { throttle } from '@/utils/throttle'

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16)
}
const now = () => Date.now()

function createSessionMeta(title = 'New Chat'): ChatSession {
  const t = now()
  return { id: uid(), title, createdAt: t, updatedAt: t }
}

export const useChatStore = defineStore('chat', () => {
  /**  state  */
  const s = createSessionMeta()
  const currentId = ref<string>(s.id)
  const sessions = ref<ChatSession[]>([s])
  const currentMessages = ref<ChatMessage[]>([])

  /**  getters  */
  const currentSession = computed<ChatSession>(() => {
    return sessions.value.find((x) => x.id === currentId.value)!
  })

  /** actions  */
  function loadSessions() {
    const persisted = loadJSON<SessionsPersistedV1>(STORAGE_KEYS.sessions)
    if (!persisted || persisted.version !== 1) return
    if (!persisted.currentId || !persisted.sessions?.length) return

    const exists = persisted.sessions.some((x) => x.id === persisted.currentId)
    if (!exists) return

    currentId.value = persisted.currentId
    sessions.value = persisted.sessions
  }
  // 保留所有会话的元信息
  function persistSessions() {
    const payload: SessionsPersistedV1 = {
      version: 1,
      currentId: currentId.value,
      sessions: sessions.value,
    }
    saveJSON(STORAGE_KEYS.sessions, payload)
  }

  function loadMessages(): ChatMessage[] {
    return loadJSON<ChatMessage[]>(STORAGE_KEYS.messages(currentId.value)) ?? []
  }

  function saveCurrentMessages() {
    saveJSON(STORAGE_KEYS.messages(currentId.value), currentMessages.value)
  }
  //初始化sessions信息和当前session的message信息
  function initFromStorage() {
    loadSessions()
    currentMessages.value = loadMessages()
  }

  function switchSession(id: string) {
    if (id === currentId.value) return
    if (!sessions.value.some((x) => x.id === id)) return

    // 保存旧会话消息
    saveCurrentMessages()
    // 切换 currentId
    currentId.value = id
    //加载新会话消息到内存
    currentMessages.value = loadMessages()

    // 持久化 sessions，currentId 改了）
    persistSessions()
  }

  function createSession(title = 'New Chat') {
    // 保存当前会话消息
    saveCurrentMessages()

    const meta = createSessionMeta(title.trim() || 'New Chat')
    sessions.value.unshift(meta)
    currentId.value = meta.id
    currentMessages.value = []

    persistSessions()
    saveCurrentMessages()

    return meta.id
  }

  function renameSession(id: string, title: string) {
    const s = sessions.value.find((x) => x.id === id)
    if (!s) return
    s.title = title.trim() || s.title
    s.updatedAt = now()

    persistSessions()
  }

  function deleteSession(id: string) {
    if (!sessions.value.some((x) => x.id === id)) return

    // 删除消息存储
    remove(STORAGE_KEYS.messages(id))

    // 删除 meta
    sessions.value = sessions.value.filter((x) => x.id !== id)

    // 保证至少有一个会话
    if (sessions.value.length === 0) {
      const meta = createSessionMeta()
      sessions.value = [meta]
    }

    // 如果删的是当前会话：切到第一个并加载消息
    if (currentId.value === id) {
      const first = sessions.value[0]
      if (!first) return
      currentId.value = first.id
      currentMessages.value = loadMessages()
    }
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

    const s = currentSession.value
    s.updatedAt = now()

    flushStorageThrottled()
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

    flushStorageThrottled()
    return msg
  }

  function updateMessage(id: string, patch: Partial<ChatMessage>) {
    const target = currentMessages.value.find((m) => m.id === id)
    if (target) Object.assign(target, patch)
    currentSession.value.updatedAt = now()

    flushStorageThrottled()
  }

  function appendToMessage(id: string, delta: string) {
    const target = currentMessages.value.find((m) => m.id === id)
    if (target) target.content += delta
    currentSession.value.updatedAt = now()

    flushStorageThrottled()
  }

  function resetMessageForRetry(id: string) {
    const target = currentMessages.value.find((m) => m.id === id)
    if (!target) return
    target.content = ''
    target.status = 'streaming'
    target.error = undefined
    currentSession.value.updatedAt = now()

    flushStorageThrottled()
  }

  function flushStorage() {
    persistSessions()
    saveCurrentMessages()
  }

  const flushStorageThrottled = throttle(() => flushStorage(), 1000)

  return {
    // state
    currentId,
    sessions,
    currentMessages,

    // getters
    currentSession,

    // actions
    persistSessions,
    loadSessions,
    saveCurrentMessages,
    loadMessages,
    initFromStorage,
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
    flushStorageThrottled,
  }
})

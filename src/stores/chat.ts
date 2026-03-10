import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { ChatMessage, ChatSession, SessionsPersistedV2 } from '@/types/chat'
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
  const sessions = ref<ChatSession[]>([s])
  const currentMessages = ref<ChatMessage[]>([])

  /**  getters  */
  const currentId = computed(() => sessions.value[0]?.id ?? '')
  const currentSession = computed<ChatSession>(() => {
    return sessions.value[0]!
  })

  /** actions  */
  function loadSessions() {
    const persisted = loadJSON<SessionsPersistedV2 | { version: 1; currentId: string; sessions: ChatSession[] }>(
      STORAGE_KEYS.sessions,
    )
    if (!persisted) return
    if (!persisted.sessions?.length) return


    sessions.value = persisted.sessions
  }
  // 保留所有会话的元信息
  function persistSessions() {
    const payload: SessionsPersistedV2 = {
      version: 2,
      sessions: sessions.value,
    }
    saveJSON(STORAGE_KEYS.sessions, payload)
  }

  function loadMessages(): ChatMessage[] {
    if (!currentId.value) return []
    return loadJSON<ChatMessage[]>(STORAGE_KEYS.messages(currentId.value)) ?? []
  }

  function saveCurrentMessages() {
    if (!currentId.value) return
    saveJSON(STORAGE_KEYS.messages(currentId.value), currentMessages.value)
  }
  //初始化sessions信息和当前session的message信息
  function initFromStorage() {
    loadSessions()
    currentMessages.value = loadMessages()
  }

  function switchSession(index: number) {
    if (index === 0) return
    if (index < 0 || index >= sessions.value.length) return

    // 保存旧会话消息
    saveCurrentMessages()
    // 切换时将会话置顶（最近使用在上）
    const [target] = sessions.value.splice(index, 1)
    if (!target) return
    target.updatedAt = now()
    sessions.value.unshift(target)
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

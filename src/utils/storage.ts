export function loadJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function saveJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // localStorage 满/隐私模式等情况，先静默
  }
}

export function remove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export const STORAGE_KEYS = {
  sessions: 'ai-floatball:sessions:v1',
  // legacy localStorage messages key (migrated to IndexedDB)
  messages: (sessionId: string) => `ai-floatball:messages:v1:${sessionId}`,
} as const

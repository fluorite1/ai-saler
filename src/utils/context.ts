import type { ContextItem } from '@/types/chat'

export type ContextTrimOptions = {
  /** 最多保留多少条 message（从后往前取） */
  maxMessages: number
  /** 总字符上限（粗略控制 token） */
  maxChars: number
  /** 是否尽量按“user+assistant”成对保留（体验更稳定） */
  keepPairs?: boolean
}

/**
 * 从 messages（按时间顺序）裁剪出一个更短的上下文：
 * - 从末尾往前取
 * - 控制 maxMessages、maxChars
 * - 可选 keepPairs：尽量不把一轮对话截断在一半
 */
export function trimContext(messages: ContextItem[], opt: ContextTrimOptions): ContextItem[] {
  const { maxMessages, maxChars, keepPairs = true } = opt

  if (messages.length <= maxMessages) {
    return trimByChars(messages, maxChars)
  }

  let sliced = messages.slice(-maxMessages)

  // 尽量成对：如果开头是 assistant，说明把 user 截掉了，丢掉这条 assistant
  const first = sliced[0]
  if (keepPairs && first && first.role === 'assistant') {
    sliced = sliced.slice(1)
  }

  return trimByChars(sliced, maxChars)
}

function trimByChars(messages: ContextItem[], maxChars: number): ContextItem[] {
  let total = 0
  const result: ContextItem[] = []

  // 从后往前累加，确保“最新的内容优先保留”
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (!m) continue
    const len = m.content?.length ?? 0
    if (result.length > 0 && total + len > maxChars) break
    total += len
    result.push(m)
  }

  return result.reverse()
}

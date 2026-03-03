export async function* sseLines(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  while (true) {
    if (signal?.aborted) {
      try {
        await reader.cancel()
      } catch {}
      return
    }

    const { value, done } = await reader.read()
    if (done) return

    buffer += decoder.decode(value, { stream: true })

    // SSE 事件以空行分隔
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)

      for (const line of rawEvent.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const data = trimmed.slice(5).trim()
        // 可能会有空 data 行
        if (data !== '') yield data
      }
    }
  }
}

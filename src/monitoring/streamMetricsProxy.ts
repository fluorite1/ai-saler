import { reportMetric } from '@/monitoring'
import type { ChatCompletionChunk } from '@/services/openai-like/types'
import type { StreamMetricStatus } from '@/monitoring/types'
import { heapPeek, heapPop, heapPush, type MinHeap } from '@/utils/heap'

export type StreamMetricMeta = { topK: number; requestId?: string }

function extractDelta(chunk: ChatCompletionChunk): string {
  return chunk?.choices?.[0]?.delta?.content ?? ''
}

function isAbortError(err: unknown) {
  return err instanceof DOMException && err.name === 'AbortError'
}

export async function* createStreamMetricsProxy(
  source: AsyncGenerator<ChatCompletionChunk>,
  meta: StreamMetricMeta,
): AsyncGenerator<ChatCompletionChunk> {
  const requestId =
    meta.requestId ??
    (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`)

  let firstTokenAt: number | null = null
  let lastTokenAt: number | null = null
  const topKHeap: MinHeap = { data: [] }
  let status: StreamMetricStatus = 'done'
  const start = performance.now()

  try {
    for await (const chunk of source) {
      const now = performance.now()
      const delta = extractDelta(chunk)

      if (delta) {
        if (firstTokenAt == null) firstTokenAt = now
        if (lastTokenAt != null) {
          const gap = now - lastTokenAt
          if (meta.topK > 0) {
            if (topKHeap.data.length < meta.topK) {
              heapPush(topKHeap, gap)
            } else {
              const min = heapPeek(topKHeap)
              if (min != null && gap > min) {
                heapPop(topKHeap)
                heapPush(topKHeap, gap)
              }
            }
          }
        }
        lastTokenAt = now
      }

      yield chunk
    }
  } catch (err) {
    status = isAbortError(err) ? 'aborted' : 'error'
    throw err
  } finally {
    const end = performance.now()
    const topKChunkGapMs = [...topKHeap.data].sort((a, b) => b - a)

    reportMetric({
      type: 'stream_metric',
      ts: Date.now(),
      page: location.pathname,
      metric: {
        requestId,
        streamTTFBMs: firstTokenAt == null ? null : firstTokenAt - start,
        streamTTLBMs: end - start,
        topKChunkGapMs,
        status,
      },
    })
  }
}


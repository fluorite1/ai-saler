export type BaseMetricEvent = {
  ts: number
  page: string
}

export type WebVitalMetricEvent = BaseMetricEvent & {
  type: 'web_vital'
  name: 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB'
  value: number
  rating?: 'good' | 'needs-improvement' | 'poor'
}

export type StreamMetricStatus = 'done' | 'aborted' | 'error'

export type StreamMetricEvent = BaseMetricEvent & {
  type: 'stream_metric'
  metric: {
    requestId: string
    streamTTFBMs: number | null
    streamTTLBMs: number
    topKChunkGapMs: number[]
    status: StreamMetricStatus
  }
}

export type MetricEvent = WebVitalMetricEvent | StreamMetricEvent


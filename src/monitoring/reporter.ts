import type { MetricEvent } from './types'

export type MetricsReporterOptions = {
  reportUrl: string
  batchSize: number
  flushIntervalMs: number
}

export class MetricsReporter {
  private static STORAGE_KEY = 'metrics_queue_v1'
  private static MAX_CACHED = 50

  private reportUrl: string
  private batchSize: number
  private flushIntervalMs: number
  private queue: MetricEvent[] = []
  private timer: number | null = null
  private inflight = false

  constructor(opts: MetricsReporterOptions) {
    this.reportUrl = opts.reportUrl
    this.batchSize = opts.batchSize
    this.flushIntervalMs = opts.flushIntervalMs
  }

  start() {
    if (this.timer != null) return
    this.loadQueue()
    this.timer = window.setInterval(() => {
      this.flush()
    }, this.flushIntervalMs)

    const onPageHide = () => this.flushOnUnload()
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') this.flushOnUnload()
    })
  }

  push(event: MetricEvent) {
    this.queue.push(event)
    this.saveQueue()
    if (this.queue.length >= this.batchSize) {
      this.flush()
    }
  }

  // queue -> request local sendingQueue
  private moveToSending(): { body: string; sendingQueue: MetricEvent[] } | null {
    if (this.queue.length === 0) return null
    const sendingQueue = this.queue.splice(0, this.queue.length)
    const body = JSON.stringify({ events: sendingQueue })
    return { body, sendingQueue }
  }

  private onSendFailure(sendingQueue: MetricEvent[]) {
    if (sendingQueue.length === 0) return
    // 失败则将 sendingQueue 放回 queue 头部，等待后续触发再上报
    this.queue.push(...sendingQueue)
    this.saveQueue()
  }

  private saveQueue() {
    try {
      const payload = this.queue.slice(-MetricsReporter.MAX_CACHED)
      localStorage.setItem(MetricsReporter.STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // ignore storage errors
    }
  }

  private loadQueue() {
    try {
      const raw = localStorage.getItem(MetricsReporter.STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as MetricEvent[]
      if (!Array.isArray(parsed) || parsed.length === 0) return
      this.queue = parsed.slice(-MetricsReporter.MAX_CACHED)
    } catch {
      // ignore parse errors
    }
  }

  // 阈值触发的实时上报
  flush() {
    if (this.inflight) return
    const snap = this.moveToSending()
    if (!snap) return
    const { body, sendingQueue } = snap

    this.inflight = true
    fetch(this.reportUrl, {
      method: 'POST',
      body, // string body; no custom headers => typically text/plain, avoids CORS preflight
    })
      .then((res) => {
        if (!res.ok) {
          this.onSendFailure(sendingQueue)
          return
        }
        this.saveQueue()
      })
      .catch(() => {
        this.onSendFailure(sendingQueue)
      })
      .finally(() => {
        this.inflight = false
      })
  }

  // 页面卸载时上报
  flushOnUnload() {
    const snap = this.moveToSending()
    if (!snap) return
    const { body, sendingQueue } = snap

    if (navigator.sendBeacon) {
      const ok = navigator.sendBeacon(this.reportUrl, new Blob([body], { type: 'text/plain' }))
      if (ok) {
        this.saveQueue()
        return
      }
    }

    fetch(this.reportUrl, {
      method: 'POST',
      body,
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok) {
          this.onSendFailure(sendingQueue)
          return
        }
        this.saveQueue()
      })
      .catch(() => {
        this.onSendFailure(sendingQueue)
      })
  }
}


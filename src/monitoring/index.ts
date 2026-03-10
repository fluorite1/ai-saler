import { MetricsReporter } from './reporter'
import { startWebVitalsCollection } from './webVitals'
import type { MetricEvent } from './types'

type MonitoringInitOptions = {
  reportUrl: string
  batchSize: number
  flushIntervalMs: number
}

let reporter: MetricsReporter | null = null

export function initMonitoring(opts: MonitoringInitOptions) {
  if (!opts.reportUrl) return
  if (reporter) return

  reporter = new MetricsReporter({
    reportUrl: opts.reportUrl,
    batchSize: opts.batchSize,
    flushIntervalMs: opts.flushIntervalMs,
  })
  reporter.start()
  startWebVitalsCollection(reporter)
}

export function reportMetric(event: MetricEvent) {
  reporter?.push(event)
}


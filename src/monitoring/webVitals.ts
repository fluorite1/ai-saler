import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'
import type { Metric as WebVitalsMetric } from 'web-vitals'
import type { MetricsReporter } from './reporter'

function reportVital(reporter: MetricsReporter, metric: WebVitalsMetric) {
  reporter.push({
    type: 'web_vital',
    ts: Date.now(),
    page: location.pathname,
    name: metric.name as 'CLS' | 'FCP' | 'INP' | 'LCP' | 'TTFB',
    value: metric.value,
    rating: metric.rating,
  })
}

export function startWebVitalsCollection(reporter: MetricsReporter) {
  onCLS((m) => reportVital(reporter, m))
  onFCP((m) => reportVital(reporter, m))
  onINP((m) => reportVital(reporter, m))
  onLCP((m) => reportVital(reporter, m))
  onTTFB((m) => reportVital(reporter, m))
}


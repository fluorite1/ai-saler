export type AppConfig = {
  openaiCompat: {
    apiKey: string
    baseURL: string
    model: string
    timeoutMs: number
    retries: number
  }
  context: {
    maxMessages: number
    maxChars: number
  }
  monitoring: {
    reportUrl: string
    batchSize: number
    flushIntervalMs: number
    streamTopK: number
  }
}

export type AppConfigLoadResult = {
  config: AppConfig
  errors: string[]
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function parseNumber(
  raw: unknown,
  fallback: number,
  opt?: { min?: number; max?: number; integer?: boolean },
): number {
  if (!isNonEmptyString(raw)) return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback

  const integer = opt?.integer ?? false
  const v = integer ? Math.floor(n) : n

  if (typeof opt?.min === 'number' && v < opt.min) return fallback
  if (typeof opt?.max === 'number' && v > opt.max) return fallback
  return v
}

function looksLikeHttpUrl(v: string) {
  return /^https?:\/\//i.test(v)
}

export function loadAppConfig(): AppConfigLoadResult {
  const errors: string[] = []
  const env = import.meta.env

  const baseURL = isNonEmptyString(env.VITE_OPENAI_COMPAT_BASE_URL)
    ? env.VITE_OPENAI_COMPAT_BASE_URL.trim()
    : ''
  const apiKey = isNonEmptyString(env.VITE_OPENAI_COMPAT_API_KEY)
    ? env.VITE_OPENAI_COMPAT_API_KEY
    : ''
  const model = isNonEmptyString(env.VITE_OPENAI_MODEL) ? env.VITE_OPENAI_MODEL.trim() : ''

  if (!baseURL) errors.push('Missing env: VITE_OPENAI_COMPAT_BASE_URL')
  else if (!looksLikeHttpUrl(baseURL))
    errors.push('Invalid VITE_OPENAI_COMPAT_BASE_URL (must start with http/https)')

  if (!apiKey) errors.push('Missing env: VITE_OPENAI_COMPAT_API_KEY')
  if (!model) errors.push('Missing env: VITE_OPENAI_MODEL')

  const timeoutMs = parseNumber(env.VITE_OPENAI_TIMEOUT_MS, 20000, {
    min: 1000,
    max: 120000,
    integer: true,
  })
  const retries = parseNumber(env.VITE_OPENAI_RETRIES, 2, { min: 0, max: 10, integer: true })

  const maxMessages = parseNumber(env.VITE_MAX_MESSAGES, 20, { min: 1, max: 200, integer: true })
  const maxChars = parseNumber(env.VITE_MAX_CHARS, 12000, { min: 1000, max: 200000, integer: true })
  const reportUrl = isNonEmptyString(env.VITE_METRICS_REPORT_URL)
    ? env.VITE_METRICS_REPORT_URL.trim()
    : ''
  const batchSize = parseNumber(env.VITE_METRICS_BATCH_SIZE, 20, {
    min: 1,
    max: 200,
    integer: true,
  })
  const flushIntervalMs = parseNumber(env.VITE_METRICS_FLUSH_INTERVAL_MS, 10000, {
    min: 1000,
    max: 60000,
    integer: true,
  })
  const streamTopK = parseNumber(env.VITE_STREAM_GAP_TOPK, 5, { min: 1, max: 20, integer: true })

  return {
    config: {
      openaiCompat: { apiKey, baseURL, model, timeoutMs, retries },
      context: { maxMessages, maxChars },
      monitoring: { reportUrl, batchSize, flushIntervalMs, streamTopK },
    },
    errors,
  }
}

export type RetryOptions = {
  retries: number
  baseDelayMs?: number
  maxDelayMs?: number
  shouldRetry?: (err: unknown, attempt: number) => boolean
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { retries, baseDelayMs = 300, maxDelayMs = 2000, shouldRetry = () => true } = options

  let lastErr: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt)
    } catch (err) {
      lastErr = err
      if (attempt === retries) break
      if (!shouldRetry(err, attempt)) break

      const delay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt))
      await sleep(delay)
    }
  }

  throw lastErr
}

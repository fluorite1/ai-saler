export function throttle<T extends (...args: any[]) => void>(fn: T, wait = 100) {
  let last = 0
  let timer: number | null = null
  let lastArgs: any[] | null = null

  return (...args: Parameters<T>) => {
    const now = Date.now()
    const remaining = wait - (now - last)
    lastArgs = args

    if (remaining <= 0) {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      last = now
      fn(...args)
      lastArgs = null
      return
    }

    if (!timer) {
      timer = window.setTimeout(() => {
        last = Date.now()
        timer = null
        if (lastArgs) {
          fn(...(lastArgs as Parameters<T>))
          lastArgs = null
        }
      }, remaining)
    }
  }
}

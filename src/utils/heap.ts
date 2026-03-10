export type MinHeap = {
  data: number[]
}

export function heapPeek(heap: MinHeap): number | undefined {
  return heap.data.length > 0 ? heap.data[0] : undefined
}

export function heapPush(heap: MinHeap, value: number) {
  const arr = heap.data
  arr.push(value)
  let i = arr.length - 1
  while (i > 0) {
    const p = Math.floor((i - 1) / 2)
    const pv = arr[p]!
    const iv = arr[i]!
    if (pv <= iv) break
    ;[arr[p], arr[i]] = [iv, pv]
    i = p
  }
}

export function heapPop(heap: MinHeap): number | undefined {
  const arr = heap.data
  if (arr.length === 0) return undefined
  const top = arr[0]
  const last = arr.pop()!
  if (arr.length === 0) return top
  arr[0] = last
  let i = 0
  while (true) {
    const l = i * 2 + 1
    const r = i * 2 + 2
    let s = i
    const base = arr[s]!
    if (l < arr.length && arr[l]! < base) s = l
    if (r < arr.length && arr[r]! < arr[s]!) s = r
    if (s === i) break
    const iv = arr[i]!
    const sv1 = arr[s]!
    ;[arr[i], arr[s]] = [sv1, iv]
    i = s
  }
  return top
}

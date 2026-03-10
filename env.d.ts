/// <reference types="vite/client" />

// Minimal shim for vue-virtual-scroller (package ships without TS types)
declare module 'vue-virtual-scroller' {
  import type { DefineComponent } from 'vue'
  export const DynamicScroller: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export const DynamicScrollerItem: DefineComponent<
    Record<string, unknown>,
    Record<string, unknown>,
    unknown
  >
}

interface ImportMetaEnv {
  readonly VITE_OPENAI_COMPAT_API_KEY: string
  readonly VITE_OPENAI_COMPAT_BASE_URL: string
  readonly VITE_OPENAI_TIMEOUT_MS?: string
  readonly VITE_OPENAI_RETRIES?: string
  readonly VITE_OPENAI_MODEL: string
  readonly VITE_MAX_MESSAGES?: string
  readonly VITE_MAX_CHARS?: string
  readonly VITE_METRICS_REPORT_URL?: string
  readonly VITE_METRICS_BATCH_SIZE?: string
  readonly VITE_METRICS_FLUSH_INTERVAL_MS?: string
  readonly VITE_STREAM_GAP_TOPK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

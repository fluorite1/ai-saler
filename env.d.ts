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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

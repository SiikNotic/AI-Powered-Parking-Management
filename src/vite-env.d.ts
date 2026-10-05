/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" (default) or "supabase" once the Supabase services exist. */
  readonly VITE_DATA_SOURCE?: string
  /** "hash" for static hosting without SPA rewrites; defaults to browser history routing. */
  readonly VITE_ROUTER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

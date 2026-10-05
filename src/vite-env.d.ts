/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "mock" (default) or "supabase" once the Supabase services exist. */
  readonly VITE_DATA_SOURCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

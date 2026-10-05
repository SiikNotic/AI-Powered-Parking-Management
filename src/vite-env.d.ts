/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "demo" (default) or "supabase" once the Supabase services exist. */
  readonly VITE_DATA_SOURCE?: string
  /** Public project URL and anon key — never a service_role key. */
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** "hash" for static hosting without SPA rewrites; defaults to browser history routing. */
  readonly VITE_ROUTER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

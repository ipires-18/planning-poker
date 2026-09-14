/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Frases da comemoração de consenso, separadas por `|`. Opcional. */
  readonly VITE_CONSENSUS_CHEERS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

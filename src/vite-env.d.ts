/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_STATUS_TITLE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

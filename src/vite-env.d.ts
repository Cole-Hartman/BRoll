/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IMMICH_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

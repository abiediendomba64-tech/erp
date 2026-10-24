interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_GOOGLE_APPS_SCRIPT_WEBAPP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

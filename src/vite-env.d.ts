interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_ERP_WEB_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_API_KEY_SECRET: string;
  readonly VITE_API_URL: string;
  readonly VITE_TURNSTILE_SITE_KEY: string;
  readonly VITE_FACEBOOK_APP_ID: string;
  readonly VITE_FACEBOOK_REDIRECT_URI: string;
  readonly VITE_ZALO_APP_ID: string;
  readonly VITE_ZALO_REDIRECT_URI: string;
  readonly VITE_ECCHO_EDITION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

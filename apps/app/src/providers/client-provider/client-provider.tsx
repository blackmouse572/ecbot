import { languages } from "@/i18n/languages";
import { client } from "@repo/client";
import { useLayoutEffect } from "react";
import { useTranslation } from "react-i18next";

// Auth is no longer gated here: the token lives in a localStorage-backed
// atom (see modules/auth/state.ts) that's read synchronously by the axios
// request interceptor, and an expired one is recovered reactively by the
// 401 response interceptor (useRefreshTokenEffect) — no proactive boot
// refresh, no async gap to block rendering on. This provider's only job now
// is keeping the locale header in sync.
export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();

  useLayoutEffect(() => {
    const locale =
      languages.find((lan) => lan.code === i18n.language)?.code ||
      languages[0].code;

    client.setConfig({
      headers: { "x-custom-lang": locale },
      throwOnError: true,
    });

    // LOGGER
    console.info("Current locale", locale);
    console.info("Connected to", import.meta.env.VITE_API_URL);
  }, [i18n.language]);

  return <>{children}</>;
}

import { LogoBoxSpinner } from "@repo/ui/common-components";
import { authPublicControllerImpersonateExchangeV1 } from "@repo/client";
import { useSetAtom } from "jotai/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { impersonationAtom } from "@/modules/impersonation";

export function ImpersonateBootstrap() {
  const [params] = useSearchParams();
  const setImpersonation = useSetAtom(impersonationAtom);
  const { t } = useTranslation();
  const [failed, setFailed] = useState(false);

  // The exchange code is single-use: send it once, even when StrictMode runs
  // this effect twice (a second request would fail and replace the success).
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const code = params.get("code");
    if (!code) {
      setFailed(true);
      return;
    }
    (async () => {
      const res = await authPublicControllerImpersonateExchangeV1({
        body: { code },
        throwOnError: false,
      });
      const data = (res.data as A | undefined)?.data as
        | {
            accessToken: string;
            expiresIn: number;
            sessionEndsAt?: number;
            impersonatedBy: string;
            user: { id: string; name: string; email: string };
          }
        | undefined;
      if (res.error || !data) {
        setFailed(true);
        return;
      }
      setImpersonation({
        accessToken: data.accessToken,
        expiresAt: Date.now() + data.expiresIn * 1000,
        sessionEndsAt: data.sessionEndsAt,
        impersonatedBy: data.impersonatedBy,
        user: data.user,
      });
      window.history.replaceState(null, "", "/");
      window.location.replace("/");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (failed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-y-3 p-6 text-center">
        <h1 className="text-ui-fg-base text-base font-bold">
          {t("impersonation.error.title")}
        </h1>
        <p className="txt-compact-small text-ui-fg-muted max-w-sm">
          {t("impersonation.error.body")}
        </p>
        <a
          className="text-ui-fg-interactive txt-compact-small-plus"
          href={`${import.meta.env.VITE_ADMIN_URL ?? ""}/users`}
        >
          {t("impersonation.error.back")}
        </a>
      </div>
    );
  }
  return <LogoBoxSpinner />;
}

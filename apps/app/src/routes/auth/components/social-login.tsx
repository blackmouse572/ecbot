import { Button, Tooltip } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { GoogleIcon } from "./google-icon";

/**
 * Google sign-in + "or continue with" separator.
 * The button is intentionally disabled — the backend OAuth callback flow is not
 * wired up on the frontend yet.
 */
function SocialLogin() {
  const { t } = useTranslation(undefined, { keyPrefix: "app.auth.social" });

  return (
    <div className="flex w-full flex-col gap-y-4">
      <Tooltip content={t("comingSoon")}>
        {/* Wrapper needed: a disabled button emits no pointer events for the tooltip */}
        <span className="block w-full">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            disabled
            aria-label={t("google")}
          >
            <GoogleIcon />
            {t("google")}
          </Button>
        </span>
      </Tooltip>
      <div className="flex items-center gap-x-2.5">
        <span className="bg-ui-border-base h-px flex-1" />
        <span className="txt-compact-xsmall-plus text-ui-border-base whitespace-nowrap">
          {t("continueWith")}
        </span>
        <span className="bg-ui-border-base h-px flex-1" />
      </div>
    </div>
  );
}

export { SocialLogin };

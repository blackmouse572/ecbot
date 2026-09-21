import { LinkButton } from "@/components/common";
import {
  USER_BLOCKED_FORBIDDEN_STATUS_CODE,
  useSignInWithEmailPass,
} from "@/hooks/api/auth";
import { useAuth } from "@/modules/auth";
import { ROUTES } from "@/routes";
import { Button, Checkbox, Label, toast, usePrompt } from "@medusajs/ui";
import { LoginForm } from "@repo/auth/components";
import { lazy, Suspense, useId, useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SocialLogin } from "../components/social-login";

const LOGIN_FORM_ID = "login-form";

const DevQuickLogin = import.meta.env.DEV
  ? lazy(() => import("./dev-quick-login"))
  : null;

const I18N_PREFIX = "app.auth.login";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

function LoginPage() {
  const { t, i18n } = useTranslation(undefined, {
    keyPrefix: I18N_PREFIX,
  });
  const locale = i18n.language;
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const rememberId = useId();
  const [remember, setRemember] = useState(false);

  const { mutateAsync, isPending } = useSignInWithEmailPass();
  const [_, setAuth] = useAuth();
  const prompt = usePrompt();
  // Covers the turnstile wait too — isPending alone only turns on once the
  // network call starts, leaving a gap where a fast double-click still fires.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isPending || isSubmitting;

  const onSubmit: React.ComponentProps<typeof LoginForm>["onSubmit"] = async (
    data,
  ) => {
    const { email, password, turnstileToken } = data;
    await mutateAsync(
      {
        email,
        password,
        turnstileToken,
        rememberMe: remember,
      },
      {
        onError: (error) => {
          if (error?.statusCode === USER_BLOCKED_FORBIDDEN_STATUS_CODE) {
            prompt({
              title: t("errors.banned.title"),
              description: t("errors.banned.description"),
              confirmText: t("actions.ok"),
            });
            return;
          }
          toast.error(error?.message ?? t("failed.message"));
        },
        onSuccess: (data) => {
          toast.success(t("success.message"));
          setAuth(data.accessToken);
          const redirect = search.get("redirect");
          if (redirect) {
            navigate(redirect, { replace: true });
          } else {
            navigate("/", { replace: true });
          }
        },
      },
    );
  };

  return (
    <div className="flex w-[280px] flex-col gap-y-4">
      <div className="flex flex-col items-center gap-y-1 text-center">
        <h1 className="text-ui-fg-base text-base font-bold leading-normal">
          {t("title")}
        </h1>
        <p className="txt-compact-xsmall-plus text-ui-fg-muted">
          {t("description")}
        </p>
      </div>

      <SocialLogin />

      <div className="flex flex-col gap-y-2">
        <LoginForm
          locale={locale === "vi" ? "vi" : "en"}
          id={LOGIN_FORM_ID}
          onSubmit={onSubmit}
          onSubmittingChange={setIsSubmitting}
          turnstile={
            TURNSTILE_SITE_KEY
              ? {
                  siteKey: TURNSTILE_SITE_KEY,
                  messages: {
                    required: t("errors.turnstileRequired"),
                    failed: t("errors.turnstileFailed"),
                    verifying: t("errors.turnstileVerifying"),
                  },
                }
              : undefined
          }
          messages={{
            emailPlaceholder: t("fields.email"),
            passwordPlaceholder: t("fields.password"),
          }}
          disabled={isBusy}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-x-2">
            <Checkbox
              id={rememberId}
              checked={remember}
              onCheckedChange={(value) => setRemember(value === true)}
              disabled={isBusy}
            />
            <Label
              htmlFor={rememberId}
              size="small"
              weight="plus"
              className="text-ui-fg-muted"
            >
              {t("actions.remember")}
            </Label>
          </div>
          <LinkButton
            to={`/${ROUTES.ForgotPassword}`}
            variant="primary"
            className="text-ui-fg-muted hover:text-ui-fg-subtle"
            disabled={isBusy}
          >
            {t("actions.forgotPassword")}
          </LinkButton>
        </div>
      </div>

      <div className="flex flex-col items-center gap-y-2">
        <Button
          variant="primary"
          className="w-full"
          type="submit"
          form={LOGIN_FORM_ID}
          isLoading={isBusy}
        >
          {t("actions.loginButton")}
        </Button>
        <p className="txt-compact-small text-ui-fg-muted">
          <Trans
            i18nKey={`${I18N_PREFIX}.actions.signUpRedirect`}
            components={[
              <LinkButton to={`/${ROUTES.SignUp}`} disabled={isBusy} />,
            ]}
          />
        </p>
      </div>

      {DevQuickLogin && (
        <Suspense>
          <DevQuickLogin onLogin={onSubmit} />
        </Suspense>
      )}
    </div>
  );
}

export { LoginPage };

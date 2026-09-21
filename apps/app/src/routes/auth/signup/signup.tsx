import { LinkButton } from "@/components/common";
import { useCountriesShare } from "@/hooks/api";
import { useSignUpWithEmailPass } from "@/hooks/api/auth";
import { ROUTES } from "@/routes/constants";
import { Button, toast } from "@medusajs/ui";
import { RegisterForm } from "@repo/auth/components";
import { CircularLoading } from "@repo/ui/common-components";
import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { SocialLogin } from "../components/social-login";

const REGISTER_FORM_ID = "register-form";

const I18N_PREFIX = "app.auth.register";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

function SignUpPage() {
  const { t, i18n } = useTranslation(undefined, {
    keyPrefix: I18N_PREFIX,
  });
  const locale = i18n.language;
  const navigate = useNavigate();
  const { countries, isError, error, isFetching } = useCountriesShare();
  const { signUp, isLoading } = useSignUpWithEmailPass();
  // Covers the turnstile wait too — isLoading alone only turns on once the
  // network call starts, leaving a gap where a fast double-click still fires.
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isBusy = isLoading || isSubmitting;

  const countryList =
    countries?.map((country) => ({
      label: country.name,
      value: country.id,
    })) ?? [];

  const onSubmit: React.ComponentProps<
    typeof RegisterForm
  >["onSubmit"] = async (data) => {
    const { email, password, name, country, turnstileToken } = data;

    await signUp(
      {
        email,
        password,
        name,
        country,
        turnstileToken,
      },
      {
        onError: (error) => {
          toast.error(error.message);
        },
        onSuccess: (userId) => {
          if (!userId) {
            toast.error(t("errors.signUpFailed"));
            return;
          }
          toast.success(t("success.message"));
          navigate({
            pathname: `/${ROUTES.VerifyEmail}`,
            search: `?email=${email}&userId=${userId}`,
          });
        },
      },
    );
  };

  if (isError) {
    console.log("Error fetching countries:", error);
  }

  if (isFetching) {
    return <CircularLoading />;
  }
  return (
    <div className="flex w-[280px] flex-col gap-y-4">
      <div className="flex flex-col items-center gap-y-1 text-center">
        <h1 className="text-ui-fg-base text-base font-medium leading-normal">
          {t("title")}
        </h1>
        <p className="txt-compact-xsmall-plus text-ui-fg-muted">
          {t("description")}
        </p>
      </div>

      <SocialLogin />

      <RegisterForm
        id={REGISTER_FORM_ID}
        locale={locale === "vi" ? "vi" : "en"}
        onSubmittingChange={setIsSubmitting}
        countries={countryList}
        messages={{
          emailPlaceholder: t("fields.email"),
          namePlaceholder: t("fields.name"),
          referralCodePlaceholder: t("fields.referral-code"),
          countryPlaceholder: t("fields.country"),
          passwordPlaceholder: t("fields.password"),
          confirmPassword: {
            placeholder: t("fields.confirm-password"),
            error: {
              notMatchPassword: t("errors.passwordMismatch"),
            },
          },
        }}
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
        onSubmit={onSubmit}
      />

      <Button
        variant="primary"
        className="w-full"
        type="submit"
        form={REGISTER_FORM_ID}
        isLoading={isBusy}
      >
        {t("actions.registerButton")}
      </Button>

      <p className="txt-compact-small text-ui-fg-muted text-center">
        <Trans
          i18nKey={`${I18N_PREFIX}.actions.loginRedirect`}
          components={[
            <LinkButton
              to={{
                pathname: `/${ROUTES.Login}`,
              }}
            ></LinkButton>,
          ]}
        />
      </p>
    </div>
  );
}

export { SignUpPage };

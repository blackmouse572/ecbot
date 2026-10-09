import { LegalText } from "@/components/common";
import { useTermsAcceptance } from "@/hooks/api/users";
import { useImpersonation } from "@/modules/impersonation";
import { Prompt, toast } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/**
 * Blocks the app until the user accepts the current Terms and Privacy Policy.
 * Shown to accounts that never recorded consent or accepted an older version.
 */
export const TermsAcceptancePrompt: FC = () => {
  const { t } = useTranslation();
  const impersonation = useImpersonation();
  const { required, accept, isPending } = useTermsAcceptance();

  // Consent is personal: an operator impersonating must not accept for the user.
  if (impersonation || !required) return null;

  const handleAccept = () =>
    accept().catch(() => toast.error(t("termsPrompt.error")));

  return (
    <Prompt open variant="confirmation">
      <Prompt.Content>
        <Prompt.Header>
          <Prompt.Title>{t("termsPrompt.title")}</Prompt.Title>
          <Prompt.Description>
            <LegalText i18nKey="termsPrompt.description" />
          </Prompt.Description>
        </Prompt.Header>
        <Prompt.Footer>
          <Prompt.Action
            type="button"
            onClick={handleAccept}
            disabled={isPending}
          >
            {t("termsPrompt.accept")}
          </Prompt.Action>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  );
};

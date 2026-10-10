import type { FC } from "react";
import { Trans } from "react-i18next";
import { LegalLink } from "./legal-link";

type LegalTextProps = {
  /** A translation that wraps the policy names in `<terms>` and `<privacy>`. */
  i18nKey:
    | "app.auth.register.fields.acceptTerms"
    | "accounts.link.acceptTerms"
    | "widget.aiNotice"
    | "termsPrompt.description";
  /** Overrides the Privacy Policy link, e.g. with a business's own policy. */
  privacyUrl?: string;
};

/** A sentence with links to the Terms of Service and Privacy Policy docs pages. */
export const LegalText: FC<LegalTextProps> = ({ i18nKey, privacyUrl }) => (
  <Trans
    i18nKey={i18nKey}
    components={{
      terms: <LegalLink path="legal/terms-of-service" />,
      privacy: <LegalLink path="legal/privacy-policy" href={privacyUrl} />,
    }}
  />
);

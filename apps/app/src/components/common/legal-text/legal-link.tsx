import { docsUrl } from "@/libs/docs-url";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";

/** Opens a docs page (in the current language) in a new tab. */
export const LegalLink: FC<{ path: string; children?: ReactNode }> = ({
  path,
  children,
}) => {
  const { i18n } = useTranslation();
  return (
    <a
      href={docsUrl(path, i18n.language)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
};

import { ArrowUpRightOnBox } from "@medusajs/icons";
import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import { docsUrl } from "@/libs/docs-url";
import { MCP_SERVER_URL } from "../constants";
import { CopyField } from "./copy-field";

/** What an MCP client needs besides the key itself. */
export const ApiKeyQuickStart = () => {
  const { t, i18n } = useTranslation();

  return (
    <section className="flex flex-col gap-y-4 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Heading level="h3">
          {t("settings.clientCredentials.quickStart.title")}
        </Heading>
        <a
          href={docsUrl("dev/mcp", i18n.language)}
          target="_blank"
          rel="noreferrer"
          className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover txt-compact-small-plus inline-flex items-center gap-x-1"
        >
          {t("settings.clientCredentials.quickStart.guide")}
          <ArrowUpRightOnBox />
        </a>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <CopyField
          label={t("settings.clientCredentials.quickStart.serverUrl")}
          value={MCP_SERVER_URL}
        />
        <CopyField
          label={t("settings.clientCredentials.quickStart.header")}
          value={t("settings.clientCredentials.quickStart.headerValue")}
        />
      </div>
    </section>
  );
};

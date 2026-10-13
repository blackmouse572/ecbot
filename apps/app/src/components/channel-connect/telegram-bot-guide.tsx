import type { FC } from "react";
import { Trans, useTranslation } from "react-i18next";

const BOTFATHER_URL = "https://t.me/BotFather";

const STEPS = ["open", "newbot", "name", "username", "copy", "paste"] as const;

const I18N_PREFIX = "accounts.create.connect.telegram.guide";

/**
 * Collapsible @BotFather walkthrough under the Telegram token input, for
 * owners who have never created a Telegram bot. `summaryId` lets the input
 * point `aria-describedby` at the summary line.
 */
export const TelegramBotGuide: FC<{ summaryId: string }> = ({ summaryId }) => {
  const { t } = useTranslation();

  return (
    <details>
      <summary
        id={summaryId}
        className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover cursor-pointer txt-compact-xsmall-plus"
      >
        {t(`${I18N_PREFIX}.title`)}
      </summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        {STEPS.map((step) => (
          <li key={step} className="txt-compact-xsmall text-ui-fg-subtle">
            <Trans
              i18nKey={`${I18N_PREFIX}.steps.${step}`}
              components={[
                <a
                  href={BOTFATHER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover underline-offset-2 hover:underline"
                />,
              ]}
            />
          </li>
        ))}
      </ol>
    </details>
  );
};

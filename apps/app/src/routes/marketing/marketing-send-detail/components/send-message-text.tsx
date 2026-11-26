import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

const TOKENS = /(\{name\}|\{product\})/g;

const LABEL_KEY: Record<string, string> = {
  "{name}": "marketing.send.message.tokenName",
  "{product}": "marketing.send.message.tokenProduct",
};

/** A send's text as the shop wrote it, {name} and {product} as chips. */
export const SendMessageText: FC<{ text: string }> = ({ text }) => {
  const { t } = useTranslation();

  return (
    <Text size="small" className="whitespace-pre-line break-words">
      {text.split(TOKENS).map((part, index) =>
        LABEL_KEY[part] ? (
          <span
            key={index}
            className="bg-ui-tag-blue-bg text-ui-tag-blue-text shadow-borders-base txt-compact-small-plus mx-px rounded px-1 py-px"
          >
            {`{${t(LABEL_KEY[part])}}`}
          </span>
        ) : (
          part
        ),
      )}
    </Text>
  );
};

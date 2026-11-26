import { Text } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  isVariable,
  MESSAGE_TOKENS,
  MESSAGE_VARIABLE_LABEL_KEY,
} from "../../marketing-send-create/utils/message-variables";

/** A send's text as the shop wrote it, {name} and {product} as chips. */
export const SendMessageText: FC<{ text: string }> = ({ text }) => {
  const { t } = useTranslation();

  return (
    <Text size="small" className="whitespace-pre-line break-words">
      {text.split(MESSAGE_TOKENS).map((part, index) => {
        const key = part.slice(1, -1);

        return isVariable(key) && part === `{${key}}` ? (
          <span
            key={index}
            className="bg-ui-tag-blue-bg text-ui-tag-blue-text shadow-borders-base txt-compact-small-plus mx-px rounded px-1 py-px"
          >
            {`{${t(MESSAGE_VARIABLE_LABEL_KEY[key])}}`}
          </span>
        ) : (
          part
        );
      })}
    </Text>
  );
};

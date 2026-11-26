import type { FC } from "react";
import { useTranslation } from "react-i18next";
import {
  isVariable,
  MESSAGE_TOKENS,
  MESSAGE_VARIABLE_LABEL_KEY,
} from "../../marketing-send-create/utils/message-variables";

/** A send's text, {name} and {product} shown by their labels. */
export const SendMessageText: FC<{ text: string }> = ({ text }) => {
  const { t } = useTranslation();

  return (
    <>
      {text.split(MESSAGE_TOKENS).map((part, index) => {
        const key = part.slice(1, -1);

        return isVariable(key) && part === `{${key}}` ? (
          <span key={index} className="font-medium">
            {`{${t(MESSAGE_VARIABLE_LABEL_KEY[key])}}`}
          </span>
        ) : (
          part
        );
      })}
    </>
  );
};

import { clx } from "@medusajs/ui";
import type { FC } from "react";
import { jsonTokens } from "./json-tokens";

type Props = {
  value: unknown;
  /** Color strings and numbers as an error. */
  error?: boolean;
};

const TOKEN_CLASS = {
  key: "text-ui-fg-base",
  string: "text-ui-tag-green-text",
  number: "text-ui-fg-interactive",
  plain: "",
} as const;

/** Pretty-printed, colored JSON. */
export const JsonBlock: FC<Props> = ({ value, error }) => (
  <pre className="text-ui-fg-muted overflow-x-auto font-mono text-xs leading-relaxed whitespace-pre">
    {jsonTokens(value).map((token, i) => (
      <span
        key={i}
        className={clx(
          TOKEN_CLASS[token.kind],
          error &&
            (token.kind === "string" || token.kind === "number") &&
            "text-ui-fg-error",
        )}
      >
        {token.text}
      </span>
    ))}
  </pre>
);

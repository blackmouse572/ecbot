import { PROFILE_LIMITS, type CustomAddressStyle } from "@repo/agent-blueprint";
import { Input, Label, Text } from "@medusajs/ui";
import { useId, type FC } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  words: CustomAddressStyle;
  onChange: (words: CustomAddressStyle) => void;
  showMissing: boolean;
};

const MAX_LENGTH = PROFILE_LIMITS.customAddressStyle.length;

/** The owner's own address style, e.g. Shop / ba mẹ (#157). */
export const CustomAddressEditor: FC<Props> = ({ words, onChange, showMissing }) => {
  const { t } = useTranslation();
  const id = useId();
  const fields = [
    { key: "self", labelKey: "agentBuilder.ui.customAddressSelf", placeholderKey: "agentBuilder.ui.customAddressSelfPlaceholder" },
    { key: "customer", labelKey: "agentBuilder.ui.customAddressCustomer", placeholderKey: "agentBuilder.ui.customAddressCustomerPlaceholder" },
  ] as const;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key} className="flex flex-col gap-1">
            <Label htmlFor={`${id}-${f.key}`} size="xsmall" className="text-ui-fg-subtle">{t(f.labelKey)}</Label>
            <Input
              id={`${id}-${f.key}`}
              size="small"
              value={words[f.key]}
              maxLength={MAX_LENGTH}
              placeholder={t(f.placeholderKey)}
              onChange={(e) => onChange({ ...words, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
      {showMissing && (
        <Text size="xsmall" className="text-ui-fg-error">{t("agentBuilder.ui.customAddressMissing")}</Text>
      )}
    </div>
  );
};

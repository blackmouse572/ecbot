import { PROFILE_LIMITS } from "@repo/agent-blueprint";
import { Badge, Button, Input, Label, Text } from "@medusajs/ui";
import { IconX } from "@tabler/icons-react";
import { useId, useState, type FC, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  labels: string[];
  onChange: (labels: string[]) => void;
};

const { count: MAX_COUNT, length: MAX_LENGTH } = PROFILE_LIMITS.customCollect;

/** The owner's own details to collect, next to the fixed choices (#287). */
export const CustomCollectEditor: FC<Props> = ({ labels, onChange }) => {
  const { t } = useTranslation();
  const id = useId();
  const [draft, setDraft] = useState("");
  const full = labels.length >= MAX_COUNT;

  const add = () => {
    const label = draft.trim();
    if (!label || full) return;
    const known = labels.some((l) => l.toLowerCase() === label.toLowerCase());
    if (!known) onChange([...labels, label]);
    setDraft("");
  };

  // Enter adds the field instead of submitting the whole answer.
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    add();
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="sr-only">{t("agentBuilder.ui.customCollectLabel")}</Label>
      {labels.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <li key={label}>
              <Badge size="small" className="gap-1">
                {label}
                <button
                  type="button"
                  aria-label={t("agentBuilder.ui.customCollectRemove", { label })}
                  onClick={() => onChange(labels.filter((l) => l !== label))}
                  className="text-ui-fg-muted hover:text-ui-fg-base"
                >
                  <IconX size={12} />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            id={id}
            size="small"
            value={draft}
            maxLength={MAX_LENGTH}
            disabled={full}
            placeholder={t("agentBuilder.ui.customCollectPlaceholder")}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <Button type="button" size="small" variant="secondary" disabled={full || !draft.trim()} onClick={add}>
          {t("agentBuilder.ui.customCollectAdd")}
        </Button>
      </div>
      {full && (
        <Text size="xsmall" className="text-ui-fg-muted">
          {t("agentBuilder.ui.customCollectLimit", { count: MAX_COUNT })}
        </Text>
      )}
    </div>
  );
};

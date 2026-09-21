import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { IconFile, IconLink, IconLetterCase } from "@tabler/icons-react";
import { RadioGroup } from "@medusajs/ui";

export const KnowledgeItemTypeEnum = ["FILE", "URL", "TEXT"] as const;
export type KnowledgeItemType = (typeof KnowledgeItemTypeEnum)[number];

interface KnowledgeItemTypeSelectorProps {
  value: KnowledgeItemType | null;
  onChange: (type: KnowledgeItemType) => void;
  disabled?: boolean;
}

interface TypeOption {
  id: KnowledgeItemType;
  label: string;
  description: string;
  icon: FC<{ size?: number; className?: string }>;
}

export const KnowledgeItemTypeSelector: FC<KnowledgeItemTypeSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const { t } = useTranslation();

  const types: TypeOption[] = [
    {
      id: "FILE",
      label: t("knowledge_item.type.file"),
      description: t("knowledge_item.type.file_desc"),
      icon: IconFile,
    },
    {
      id: "URL",
      label: t("knowledge_item.type.url"),
      description: t("knowledge_item.type.url_desc"),
      icon: IconLink,
    },
    {
      id: "TEXT",
      label: t("knowledge_item.type.text"),
      description: t("knowledge_item.type.text_desc"),
      icon: IconLetterCase,
    },
  ];

  return (
    <RadioGroup
      className="grid grid-cols-3 gap-4"
      disabled={disabled}
      value={value || undefined}
      onValueChange={(v) => onChange(v as KnowledgeItemType)}
    >
      {types.map((type) => {
        return (
          <RadioGroup.ChoiceBox
            value={type.id}
            key={type.id}
            disabled={disabled}
            label={type.label}
            description={type.description}
          />
        );
      })}
    </RadioGroup>
  );
};

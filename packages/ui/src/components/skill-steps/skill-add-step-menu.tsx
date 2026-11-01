import { PlusMini } from "@medusajs/icons";
import { Button, DropdownMenu } from "@medusajs/ui";
import type { SkillStep } from "@repo/agent-blueprint";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { SkillStepKind } from "./skill-step-kind";

const TYPES: SkillStep["type"][] = ["ask", "say", "tell", "tool", "if"];

type Props = {
  /** False at the deepest level, where an If cannot nest further. */
  canIf: boolean;
  onAdd: (type: SkillStep["type"]) => void;
};

export const SkillAddStepMenu: FC<Props> = ({ canIf, onAdd }) => {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <Button
          type="button"
          size="small"
          variant="transparent"
          className="w-fit"
        >
          <PlusMini />
          {t("skills.steps.addStep")}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="start">
        {TYPES.filter((type) => canIf || type !== "if").map((type) => (
          <DropdownMenu.Item
            key={type}
            className="gap-x-2"
            onClick={() => onAdd(type)}
          >
            <SkillStepKind type={type} />
            <span className="text-ui-fg-subtle">
              {t(`skills.steps.describe.${type}`)}
            </span>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};

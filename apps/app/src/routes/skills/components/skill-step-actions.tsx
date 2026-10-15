import {
  ArrowDownMini,
  ArrowUpMini,
  EllipsisHorizontal,
  Trash,
} from "@medusajs/icons";
import { DropdownMenu, IconButton } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  first: boolean;
  last: boolean;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
};

// The "..." menu on a step: move it within its list, or delete it.
export const SkillStepActions: FC<Props> = ({
  first,
  last,
  onMove,
  onRemove,
}) => {
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton
          type="button"
          size="small"
          variant="transparent"
          aria-label={t("skills.steps.menu")}
        >
          <EllipsisHorizontal />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        <DropdownMenu.Item
          className="gap-x-2"
          disabled={first}
          onClick={() => onMove(-1)}
        >
          <ArrowUpMini className="text-ui-fg-subtle" />
          {t("skills.steps.moveUp")}
        </DropdownMenu.Item>
        <DropdownMenu.Item
          className="gap-x-2"
          disabled={last}
          onClick={() => onMove(1)}
        >
          <ArrowDownMini className="text-ui-fg-subtle" />
          {t("skills.steps.moveDown")}
        </DropdownMenu.Item>
        <DropdownMenu.Separator />
        <DropdownMenu.Item className="gap-x-2" onClick={onRemove}>
          <Trash className="text-ui-fg-subtle" />
          {t("actions.delete")}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};

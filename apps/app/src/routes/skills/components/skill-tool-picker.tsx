import { useInfiniteToolList } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Badge } from "@medusajs/ui";
import {
  SKILL_SYSTEM_ACTIONS,
  type SkillSystemAction,
} from "@repo/agent-blueprint";
import type { ToolListResponseDto } from "@repo/client";
import { Combobox } from "@repo/ui/common-components";
import { type FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { SkillBuiltinActionIcon } from "./skill-builtin-action-icon";

const BUILTIN = Object.keys(SKILL_SYSTEM_ACTIONS) as SkillSystemAction[];

type PickerTool = Pick<ToolListResponseDto, "id" | "kind" | "displayName">;

type Props = {
  value: string;
  onChange: (toolId: string) => void;
  /** The chosen tool, so its name shows even when it is not on a loaded page. */
  selected?: PickerTool;
};

// Picks a Tool step's tool: built-in actions first, then the workspace's
// tools, searched on the server and loaded page by page on scroll.
export const SkillToolPicker: FC<Props> = ({ value, onChange, selected }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const [search, setSearch] = useState("");
  const { tools, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteToolList(workspaceSlug, search);

  const query = search.trim().toLowerCase();
  const builtins = BUILTIN.map((id) => ({
    id,
    label: t(`skills.steps.builtin.${id.slice("system:".length)}`),
  })).filter((b) => !query || b.label.toLowerCase().includes(query));

  const listed: PickerTool[] =
    selected && !search && !tools.some((x) => x.id === selected.id)
      ? [...tools, selected]
      : tools;

  const options = [
    ...builtins.map((b) => ({
      value: b.id,
      label: b.label,
      labelNode: (
        <span className="flex items-center gap-x-2">
          <SkillBuiltinActionIcon action={b.id} />
          {b.label}
        </span>
      ),
    })),
    ...listed.map((x) => ({
      value: x.id,
      label: x.displayName,
      labelNode: (
        <span className="flex items-center gap-x-2">
          <span className="truncate">{x.displayName}</span>
          <Badge size="2xsmall" color={x.kind === "HTTP" ? "blue" : "purple"}>
            {x.kind}
          </Badge>
        </span>
      ),
    })),
  ];

  return (
    <Combobox
      value={value}
      onChange={(id) => id && onChange(id)}
      searchValue={search}
      onSearchValueChange={setSearch}
      options={options}
      fetchNextPage={hasNextPage ? fetchNextPage : undefined}
      isFetchingNextPage={isFetchingNextPage}
      placeholder={t("skills.steps.placeholder.tool")}
    />
  );
};

import { useCustomerTagList } from "@/hooks/api/customer-tags";
import { useGetTool } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Badge, Input, Select } from "@medusajs/ui";
import {
  SKILL_SYSTEM_ACTIONS,
  type SkillStep,
  type SkillSystemAction,
  type ToolStep,
} from "@repo/agent-blueprint";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { StepEditorApi } from "../types";
import { SkillBuiltinActionIcon } from "./skill-builtin-action-icon";

const BUILTIN = Object.keys(SKILL_SYSTEM_ACTIONS) as SkillSystemAction[];
const builtinKey = (id: string) => id.slice("system:".length);

type Props = { step: ToolStep; api: StepEditorApi };

// A Tool step: which tool (a built-in action or a workspace tool), the MCP
// action, tag or field it needs, and an optional "how" note.
export const SkillToolStepFields: FC<Props> = ({ step, api }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const tool = api.tools.find((x) => x.id === step.toolId);
  const isMcp = tool?.kind === "MCP";
  const { tool: detail } = useGetTool(workspaceSlug, step.toolId, {
    enabled: isMcp,
  });
  const actions = ((detail?.discoveredActions ?? []) as { name?: string }[])
    .map((a) => a.name)
    .filter((name): name is string => !!name);
  const tagAction =
    step.toolId === "system:add_tag" || step.toolId === "system:remove_tag";
  const { tags } = useCustomerTagList();

  const patch = (fields: Partial<ToolStep>) =>
    api.update(step.id, (s) => ({ ...s, ...fields }) as SkillStep);
  // A new tool drops the old MCP action, tag or field name.
  const setTool = (toolId: string) =>
    api.update(
      step.id,
      (s) => ({ ...s, toolId, action: undefined }) as SkillStep,
    );

  return (
    <div className="flex flex-col gap-y-2">
      <div className="flex flex-wrap gap-2">
        <div className="min-w-48 flex-1">
          <Select
            size="small"
            value={step.toolId || undefined}
            onValueChange={setTool}
          >
            <Select.Trigger>
              <Select.Value placeholder={t("skills.steps.placeholder.tool")} />
            </Select.Trigger>
            {/* Taller than the default, so Your tools shows below the built-ins. */}
            <Select.Content className="max-h-[400px]">
              <Select.Group>
                <Select.Label>{t("skills.steps.groups.builtin")}</Select.Label>
                {BUILTIN.map((id) => (
                  <Select.Item key={id} value={id}>
                    <span className="flex items-center gap-x-2">
                      <SkillBuiltinActionIcon action={id} />
                      {t(`skills.steps.builtin.${builtinKey(id)}`)}
                    </span>
                  </Select.Item>
                ))}
              </Select.Group>
              {api.tools.length > 0 && (
                <Select.Group>
                  <Select.Label>{t("skills.steps.groups.tools")}</Select.Label>
                  {api.tools.map((x) => (
                    <Select.Item key={x.id} value={x.id}>
                      <span className="flex items-center gap-x-2">
                        {x.displayName}
                        <Badge
                          size="2xsmall"
                          color={x.kind === "HTTP" ? "blue" : "purple"}
                        >
                          {x.kind}
                        </Badge>
                      </span>
                    </Select.Item>
                  ))}
                </Select.Group>
              )}
            </Select.Content>
          </Select>
        </div>
        {(isMcp || tagAction) && (
          <div className="min-w-48 flex-1">
            <Select
              size="small"
              value={step.action || undefined}
              onValueChange={(action) => patch({ action })}
            >
              <Select.Trigger>
                <Select.Value
                  placeholder={t(
                    isMcp
                      ? "skills.steps.placeholder.action"
                      : "skills.steps.placeholder.tag",
                  )}
                />
              </Select.Trigger>
              <Select.Content>
                {(isMcp ? actions : tags.map((tag) => tag.name)).map((name) => (
                  <Select.Item key={name} value={name}>
                    {name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        )}
        {step.toolId === "system:save_customer_field" && (
          <Input
            size="small"
            className="min-w-48 flex-1"
            value={step.action ?? ""}
            placeholder={t("skills.steps.placeholder.field")}
            onChange={(e) => patch({ action: e.target.value })}
          />
        )}
      </div>
      <Input
        size="small"
        value={step.text ?? ""}
        placeholder={t("skills.steps.placeholder.how")}
        onChange={(e) => patch({ text: e.target.value })}
      />
    </div>
  );
};

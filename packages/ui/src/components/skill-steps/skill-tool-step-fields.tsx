import { Input } from "@medusajs/ui";
import {
  isSystemToolId,
  type SkillStep,
  type ToolStep,
} from "@repo/agent-blueprint";
import { Combobox } from "../common/combobox";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useSkillStepsData } from "./skill-steps-data";
import type { StepEditorApi } from "./types";
import { SkillToolPicker } from "./skill-tool-picker";

type Props = { step: ToolStep; api: StepEditorApi };

// A Tool step: which tool (a built-in action or a workspace tool), the MCP
// action, tag or field it needs, and an optional "how" note.
export const SkillToolStepFields: FC<Props> = ({ step, api }) => {
  const { t } = useTranslation();
  const { useTool, tagNames } = useSkillStepsData();
  const tool = useTool(
    step.toolId && !isSystemToolId(step.toolId) ? step.toolId : "",
  );
  const isMcp = tool?.kind === "MCP";
  const actions = ((tool?.discoveredActions ?? []) as { name?: string }[])
    .map((a) => a.name)
    .filter((name): name is string => !!name);
  const tagAction =
    step.toolId === "system:add_tag" || step.toolId === "system:remove_tag";
  const names = isMcp ? actions : (tagNames ?? []);
  // Without a tag list (a builtin template has no workspace), type the name.
  const typeName =
    step.toolId === "system:save_customer_field" || (tagAction && !tagNames);

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
          <SkillToolPicker
            value={step.toolId}
            onChange={setTool}
            selected={tool}
          />
        </div>
        {(isMcp || (tagAction && tagNames)) && (
          <div className="min-w-48 flex-1">
            <Combobox
              value={step.action ?? ""}
              onChange={(action) => action && patch({ action })}
              options={names.map((name) => ({ value: name, label: name }))}
              placeholder={t(
                isMcp
                  ? "skills.steps.placeholder.action"
                  : "skills.steps.placeholder.tag",
              )}
            />
          </div>
        )}
        {typeName && (
          <Input
            size="small"
            className="min-w-48 flex-1"
            value={step.action ?? ""}
            placeholder={t(
              tagAction
                ? "skills.steps.placeholder.tagName"
                : "skills.steps.placeholder.field",
            )}
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

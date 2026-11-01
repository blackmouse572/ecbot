import { Text } from "@medusajs/ui";
import type { SkillStepIssueCode } from "@repo/agent-blueprint";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

// Why a step or branch cannot be saved, shown under it.
export const SkillStepIssue: FC<{ code?: SkillStepIssueCode }> = ({ code }) => {
  const { t } = useTranslation();
  if (!code) return null;
  return (
    <Text size="small" className="ml-10 text-ui-fg-error">
      {t(`skills.steps.issues.${code}`)}
    </Text>
  );
};

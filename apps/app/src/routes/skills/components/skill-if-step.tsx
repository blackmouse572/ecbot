import { PlusMini, XMark } from "@medusajs/icons";
import { Button, IconButton, Input, Text } from "@medusajs/ui";
import type { IfStep, SkillStep } from "@repo/agent-blueprint";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { elseKey, newBranch } from "../step-tree";
import type { StepEditorApi } from "../types";
import { SkillStepIssue } from "./skill-step-issue";
import { SkillStepKind } from "./skill-step-kind";
import { SkillStepList } from "./skill-step-list";

type Props = {
  step: IfStep;
  number: string;
  depth: number;
  api: StepEditorApi;
  /** The step's "..." menu, shown on the If row. */
  actions: ReactNode;
};

// An If with its Else ifs and Else, each with its own steps and Add step.
export const SkillIfStep: FC<Props> = ({
  step,
  number,
  depth,
  api,
  actions,
}) => {
  const { t } = useTranslation();
  const patch = (fn: (s: IfStep) => IfStep) =>
    api.update(step.id, (s) => fn(s as IfStep) as SkillStep);
  // Nested steps number on across branches (3.1, 3.2 | 3.3), like the prompt.
  let n = 0;
  const inner = () => `${number}.${++n}`;

  const label = (text: string, num: string, end: ReactNode) => (
    <div className="flex items-start gap-x-2">
      <Text
        size="small"
        className="w-8 shrink-0 pt-1.5 tabular-nums text-ui-fg-muted"
      >
        {num}
      </Text>
      <div className="pt-1">
        <SkillStepKind type="if" label={text} />
      </div>
      {end}
    </div>
  );

  return (
    <div className="flex flex-col gap-y-3">
      {step.branches.map((branch, i) => (
        <div key={branch.id} className="flex flex-col gap-y-2">
          {label(
            i === 0 ? t("skills.steps.if") : t("skills.steps.elseIf"),
            i === 0 ? number : "",
            <>
              <div className="min-w-0 flex-1">
                <Input
                  size="small"
                  value={branch.condition}
                  placeholder={t("skills.steps.placeholder.if")}
                  onChange={(e) =>
                    patch((s) => ({
                      ...s,
                      branches: s.branches.map((b) =>
                        b.id === branch.id
                          ? { ...b, condition: e.target.value }
                          : b,
                      ),
                    }))
                  }
                />
              </div>
              {i === 0 ? (
                actions
              ) : (
                <IconButton
                  type="button"
                  size="small"
                  variant="transparent"
                  aria-label={t("skills.steps.removeBranch")}
                  onClick={() =>
                    patch((s) => ({
                      ...s,
                      branches: s.branches.filter((b) => b.id !== branch.id),
                    }))
                  }
                >
                  <XMark />
                </IconButton>
              )}
            </>,
          )}
          <SkillStepIssue code={api.issues.get(branch.id)} />
          <div className="ml-10 border-l pl-3">
            <SkillStepList
              steps={branch.steps}
              listKey={branch.id}
              depth={depth + 1}
              api={api}
              next={inner}
            />
          </div>
        </div>
      ))}
      {step.otherwise && (
        <div className="flex flex-col gap-y-2">
          {label(
            t("skills.steps.else"),
            "",
            <>
              <div className="flex-1" />
              <IconButton
                type="button"
                size="small"
                variant="transparent"
                aria-label={t("skills.steps.removeBranch")}
                onClick={() => patch((s) => ({ ...s, otherwise: undefined }))}
              >
                <XMark />
              </IconButton>
            </>,
          )}
          <div className="ml-10 border-l pl-3">
            <SkillStepList
              steps={step.otherwise}
              listKey={elseKey(step.id)}
              depth={depth + 1}
              api={api}
              next={inner}
            />
          </div>
        </div>
      )}
      <div className="ml-10 flex gap-x-1">
        <Button
          type="button"
          size="small"
          variant="transparent"
          onClick={() =>
            patch((s) => ({ ...s, branches: [...s.branches, newBranch()] }))
          }
        >
          <PlusMini />
          {t("skills.steps.elseIf")}
        </Button>
        {!step.otherwise && (
          <Button
            type="button"
            size="small"
            variant="transparent"
            onClick={() => patch((s) => ({ ...s, otherwise: [] }))}
          >
            <PlusMini />
            {t("skills.steps.else")}
          </Button>
        )}
      </div>
    </div>
  );
};

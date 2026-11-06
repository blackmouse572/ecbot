import { PlusMini, XMark } from "@medusajs/icons";
import {
  Button,
  IconButton,
  Input,
  Text,
  Textarea,
  usePrompt,
} from "@medusajs/ui";
import {
  compileSkill,
  skillToolRefs,
  validateSkillSteps,
} from "@repo/agent-blueprint";
import type { FC, ReactNode } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Form } from "../common/form";
import type { SkillFormData } from "./schemas";
import { useSkillStepsData } from "./skill-steps-data";
import { SkillStepsEditor } from "./skill-steps-editor";
import { newStep } from "./step-tree";

export type SkillTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

type Props = {
  form: UseFormReturn<SkillFormData>;
  /** The markdown editor for a text skill. */
  renderTextEditor: (props: SkillTextEditorProps) => ReactNode;
  /** Shown under the fields while the form is still empty (create's templates). */
  start?: ReactNode;
};

// Vertical skill fields, shared by the create and edit focus modals.
export const SkillFormFields: FC<Props> = ({
  form,
  renderTextEditor,
  start,
}) => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const guardrails = useFieldArray({
    control: form.control,
    name: "guardrails",
  });
  const [format, steps, instructions] = useWatch({
    control: form.control,
    name: ["format", "steps", "instructions"],
  });
  const empty = format === "CONTENT" && !instructions.trim();
  const { toolNamer } = useSkillStepsData();
  const opts = {
    shouldDirty: true,
    shouldValidate: form.formState.isSubmitted,
  };
  const listIssue = form.formState.isSubmitted
    ? validateSkillSteps(steps).find((i) => !i.id)
    : undefined;

  const switchToSteps = () => {
    form.setValue("steps", [newStep("ask")], opts);
    form.setValue("format", "STEPS", opts);
  };

  const switchToText = async () => {
    const confirmed = await prompt({
      title: t("skills.form.toText.title"),
      description: t("skills.form.toText.description"),
      confirmText: t("skills.form.toText.confirm"),
      cancelText: t("actions.cancel"),
    });
    if (!confirmed) return;
    // Only the tools these steps use, however many the workspace has.
    const ids = [...new Set(skillToolRefs(steps).map((r) => r.toolId))];
    const toolName = toolNamer ? await toolNamer(ids) : () => undefined;
    // Guardrails stay a field of their own, as edited in this form.
    const text = compileSkill({
      name: form.getValues("name"),
      guardrails: [],
      format: "STEPS",
      steps,
      toolName,
    });
    form.setValue("instructions", text, opts);
    form.setValue("steps", [], opts);
    form.setValue("format", "CONTENT", opts);
  };

  return (
    <div className="flex flex-col gap-y-6">
      <Form.Field
        control={form.control}
        name="name"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t("fields.name")}</Form.Label>
            <Form.Control>
              <Input
                {...field}
                placeholder={t("skills.form.namePlaceholder")}
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <Form.Field
        control={form.control}
        name="description"
        render={({ field }) => (
          <Form.Item>
            <Form.Label>{t("skills.form.whenToUse")}</Form.Label>
            <Form.Hint>{t("skills.form.whenToUseHint")}</Form.Hint>
            <Form.Control>
              <Textarea
                {...field}
                rows={2}
                placeholder={t("skills.form.whenToUsePlaceholder")}
              />
            </Form.Control>
            <Form.ErrorMessage />
          </Form.Item>
        )}
      />

      <div className="flex flex-col gap-y-2">
        <Form.Item>
          <Form.Label optional>{t("skills.form.guardrails")}</Form.Label>
          <Form.Hint>{t("skills.form.guardrailsHint")}</Form.Hint>
        </Form.Item>
        {guardrails.fields.map((item, index) => (
          <Form.Field
            key={item.id}
            control={form.control}
            name={`guardrails.${index}.value`}
            render={({ field }) => (
              <Form.Item>
                <div className="flex items-center gap-x-2">
                  <div className="flex-1">
                    <Form.Control>
                      <Input
                        {...field}
                        placeholder={t("skills.form.guardrailPlaceholder")}
                      />
                    </Form.Control>
                  </div>
                  <IconButton
                    type="button"
                    variant="transparent"
                    size="small"
                    aria-label={t("skills.form.removeGuardrail")}
                    onClick={() => guardrails.remove(index)}
                  >
                    <XMark />
                  </IconButton>
                </div>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
        ))}
        {guardrails.fields.length < 20 && (
          <Button
            type="button"
            size="small"
            variant="secondary"
            className="w-fit"
            onClick={() => guardrails.append({ value: "" })}
          >
            <PlusMini />
            {t("skills.form.addGuardrail")}
          </Button>
        )}
      </div>

      {format === "STEPS" ? (
        <Form.Item>
          <div className="flex items-center justify-between gap-x-2">
            <Form.Label>{t("skills.form.instructions")}</Form.Label>
            <Button
              type="button"
              size="small"
              variant="transparent"
              onClick={switchToText}
            >
              {t("skills.form.toText.action")}
            </Button>
          </div>
          <Form.Hint>{t("skills.form.stepsHint")}</Form.Hint>
          <SkillStepsEditor
            steps={steps}
            showIssues={form.formState.isSubmitted}
            onChange={(next) => form.setValue("steps", next, opts)}
          />
          {listIssue && (
            <Text size="small" className="text-ui-fg-error">
              {t(`skills.steps.issues.${listIssue.code}`)}
            </Text>
          )}
        </Form.Item>
      ) : (
        <Form.Field
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <Form.Item>
              <div className="flex items-center justify-between gap-x-2">
                <Form.Label>{t("skills.form.instructions")}</Form.Label>
                {empty && (
                  <Button
                    type="button"
                    size="small"
                    variant="transparent"
                    onClick={switchToSteps}
                  >
                    {t("skills.form.toSteps")}
                  </Button>
                )}
              </div>
              <Form.Hint>{t("skills.form.instructionsHint")}</Form.Hint>
              <Form.Control>
                {renderTextEditor({
                  value: field.value,
                  onChange: field.onChange,
                  placeholder: t("skills.form.instructionsHint"),
                })}
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      )}

      {empty && start}
    </div>
  );
};

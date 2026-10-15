import { TipTapEditor } from "@/components/common/tiptap-editor/tiptap-editor";
import { PlusMini, XMark } from "@medusajs/icons";
import { Button, IconButton, Input, Textarea, usePrompt } from "@medusajs/ui";
import type { ToolStep } from "@repo/agent-blueprint";
import type { SkillGetResponseDto } from "@repo/client";
import { Form } from "@repo/ui/common-components";
import type { FC } from "react";
import { useFieldArray, useWatch, type UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { SkillFormData } from "../schemas";
import { skillToFormValues } from "../utils";
import { SkillStartChips } from "./skill-start-chips";
import { SkillStepsView } from "./skill-steps-view";

type Props = {
  form: UseFormReturn<SkillFormData>;
  /** Create shows the "Get started with" row while the form is empty. */
  showStart?: boolean;
  toolLabel?: (step: Pick<ToolStep, "toolId" | "action">) => string;
};

// Vertical skill fields, shared by the create and edit focus modals.
export const SkillFormFields: FC<Props> = ({ form, showStart, toolLabel }) => {
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

  const applyTemplate = (skill: SkillGetResponseDto) =>
    form.reset(skillToFormValues(skill), { keepDefaultValues: true });

  const switchToText = async () => {
    const confirmed = await prompt({
      title: t("skills.form.toText.title"),
      description: t("skills.form.toText.description"),
      confirmText: t("skills.form.toText.confirm"),
      cancelText: t("actions.cancel"),
    });
    if (!confirmed) return;
    const opts = { shouldDirty: true, shouldValidate: true };
    // The compiled text already carries the rules, so they move into it.
    form.setValue("instructions", form.getValues("compiled"), opts);
    form.setValue("guardrails", [], opts);
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
          <div className="rounded-lg border bg-ui-bg-subtle p-4">
            <SkillStepsView steps={steps} toolLabel={toolLabel} />
          </div>
        </Form.Item>
      ) : (
        <Form.Field
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <Form.Item>
              <Form.Label>{t("skills.form.instructions")}</Form.Label>
              <Form.Hint>{t("skills.form.instructionsHint")}</Form.Hint>
              <Form.Control>
                <TipTapEditor
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t("skills.form.instructionsHint")}
                  format="markdown"
                />
              </Form.Control>
              <Form.ErrorMessage />
            </Form.Item>
          )}
        />
      )}

      {showStart && empty && (
        <SkillStartChips
          onTemplate={applyTemplate}
          onImport={(text) =>
            form.setValue("instructions", text, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      )}
    </div>
  );
};

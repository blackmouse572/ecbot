import { TipTapEditor } from "@/components/common/tiptap-editor/tiptap-editor";
import {
  SkillFormFields as SharedFields,
  skillToFormValues,
  type SkillFormData,
} from "@repo/ui/skill-steps";
import type { FC } from "react";
import type { UseFormReturn } from "react-hook-form";
import { SkillStartChips } from "./skill-start-chips";
import { SkillStepsDataProvider } from "./skill-steps-data-provider";

type Props = {
  form: UseFormReturn<SkillFormData>;
  /** Create shows the "Get started with" row while the form is empty. */
  showStart?: boolean;
};

// The shared skill fields, with the workspace's tools, the markdown editor
// and (on create) the template chips.
export const SkillFormFields: FC<Props> = ({ form, showStart }) => (
  <SkillStepsDataProvider>
    <SharedFields
      form={form}
      renderTextEditor={(props) => (
        <TipTapEditor {...props} format="markdown" />
      )}
      start={
        showStart && (
          <SkillStartChips
            onTemplate={(skill) =>
              form.reset(skillToFormValues(skill), { keepDefaultValues: true })
            }
            onImport={(text) =>
              form.setValue("instructions", text, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
        )
      }
    />
  </SkillStepsDataProvider>
);

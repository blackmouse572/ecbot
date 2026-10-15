import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useGetSkill, useUpdateSkill } from "@/hooks/api/skills";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Heading, Text, toast } from "@medusajs/ui";
import type { SkillGetResponseDto } from "@repo/client";
import { FormSkeleton } from "@repo/ui/common-components";
import { Helmet } from "react-helmet-async";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { SkillFormFields } from "../components/skill-form";
import { skillFormSchema, type SkillFormData } from "../schemas";
import { formValuesToBody, skillToFormValues } from "../utils";

const SkillEditForm = ({ skill }: { skill: SkillGetResponseDto }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();
  const { updateSkill, isPending } = useUpdateSkill(workspaceSlug, skill.id);

  const form = useForm<SkillFormData>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: skillToFormValues(skill),
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await updateSkill(formValuesToBody(data));
      toast.success(t("skills.edit.success"));
      handleSuccess();
    } catch (error) {
      toast.error((error as A)?.body?.message ?? t("skills.edit.error"));
    }
  });

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-6 px-6 py-10">
            <div>
              <Heading>{t("skills.edit.title")}</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {t("skills.edit.subtitle")}
              </Text>
            </div>
            <SkillFormFields form={form} />
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button variant="secondary" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button
              type="submit"
              isLoading={isPending}
              disabled={form.formState.isSubmitting}
            >
              {t("actions.save")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
};

const SkillEditInner = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { skillId } = useParams<{ skillId: string }>();
  const { skill, isLoading, isError, error } = useGetSkill(
    workspaceSlug,
    skillId ?? "",
    { enabled: !!skillId },
  );

  if (isError) throw error;

  if (isLoading || !skill) {
    return (
      <>
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="mx-auto w-full max-w-[720px] px-6 py-10">
          <FormSkeleton label={t("general.loading")} fieldCount={4} />
        </RouteFocusModal.Body>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>
          {skill.name} · {t("skills.edit.title")} - Ecbot
        </title>
      </Helmet>
      <SkillEditForm skill={skill} />
    </>
  );
};

export const SkillEdit = () => {
  const { workspaceSlug } = useWorkspaceParams();
  const { skillId } = useParams<{ skillId: string }>();
  return (
    <RouteFocusModal prev={`/${workspaceSlug}/skills/${skillId}`}>
      <SkillEditInner />
    </RouteFocusModal>
  );
};

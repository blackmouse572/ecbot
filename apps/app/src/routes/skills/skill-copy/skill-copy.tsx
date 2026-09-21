import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useCreateSkill, useGetSkill } from "@/hooks/api/skills";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { zodV4Resolver } from "@repo/ui/utils";
import { Button, Heading, Text, toast } from "@medusajs/ui";
import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { SkillFormFields } from "../components/skill-form";
import { skillFormSchema, type SkillFormData } from "../schemas";

const SkillCopyForm = ({ skillId }: { skillId: string }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();
  const { skill, isLoading } = useGetSkill(workspaceSlug, skillId, {
    enabled: !!skillId,
  });
  const { createSkill, isPending } = useCreateSkill(workspaceSlug);

  const form = useForm<SkillFormData>({
    resolver: zodV4Resolver(skillFormSchema),
    defaultValues: { name: "", description: "", instructions: "" },
  });

  useEffect(() => {
    if (skill) {
      form.reset({
        name: skill.name,
        description: skill.description ?? "",
        instructions: skill.instructions ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skill]);

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await createSkill({
        name: data.name,
        description: data.description || undefined,
        instructions: data.instructions,
      });
      toast.success(t("skills.create.success"));
      handleSuccess();
    } catch (error) {
      toast.error((error as A)?.body?.message ?? t("skills.create.error"));
    }
  });

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex flex-1 flex-col overflow-y-auto">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-6 px-6 py-10">
            <div>
              <Heading>{t("skills.copy.title")}</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {t("skills.copy.subtitle")}
              </Text>
            </div>
            {isLoading ? (
              <Text size="small" className="text-ui-fg-subtle">
                {t("skills.list.loading")}
              </Text>
            ) : (
              <SkillFormFields form={form} />
            )}
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button variant="secondary" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button type="submit" isLoading={isPending}>
              {t("actions.create")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
};

export const SkillCopy = () => {
  const { t } = useTranslation();
  const { skillId } = useParams<{ skillId: string }>();
  return (
    <RouteFocusModal>
      <Helmet>
        <title>{t("skills.copy.title")} - Ecbot</title>
      </Helmet>
      {skillId && <SkillCopyForm skillId={skillId} />}
    </RouteFocusModal>
  );
};

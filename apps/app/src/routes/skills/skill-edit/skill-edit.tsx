import { RouteDrawer } from "@/components/modals";
import { useGetSkill, useUpdateSkill } from "@/hooks/api/skills";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Heading, Text, toast } from "@medusajs/ui";
import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { SkillFormFields } from "../components/skill-form";
import { skillFormSchema, type SkillFormData } from "../schemas";

const SkillEditInner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const { skillId } = useParams<{ skillId: string }>();

  const { skill, isLoading } = useGetSkill(workspaceSlug, skillId ?? "", {
    enabled: !!skillId,
  });
  const { updateSkill, isPending } = useUpdateSkill(
    workspaceSlug,
    skillId ?? "",
  );

  const form = useForm<SkillFormData>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: {
      name: "",
      description: "",
      instructions: "",
    },
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
      await updateSkill({
        name: data.name,
        description: data.description || undefined,
        instructions: data.instructions,
      });
      toast.success(t("skills.edit.success"));
      navigate("..");
    } catch (error) {
      toast.error((error as A)?.body?.message ?? t("skills.edit.error"));
    }
  });

  if (isLoading || !skill) {
    return (
      <>
        <RouteDrawer.Header>
          <RouteDrawer.Title asChild>
            <Heading level="h2">{t("skills.edit.title")}</Heading>
          </RouteDrawer.Title>
          <RouteDrawer.Description className="sr-only">
            {t("skills.edit.subtitle")}
          </RouteDrawer.Description>
        </RouteDrawer.Header>
        <RouteDrawer.Body className="p-6">
          <Text size="small" className="text-ui-fg-subtle">
            {t("skills.list.loading")}
          </Text>
        </RouteDrawer.Body>
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
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading level="h2">{skill.name}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description asChild>
          <Text size="small" className="text-ui-fg-subtle">
            {t("skills.edit.subtitle")}
          </Text>
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      <RouteDrawer.Form form={form}>
        <RouteDrawer.Body className="flex flex-1 flex-col overflow-y-auto p-6">
          <SkillFormFields form={form} />
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="ml-auto flex items-center gap-x-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("..")}
            >
              {t("actions.cancel")}
            </Button>
            <Button type="submit" onClick={handleSubmit} isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </RouteDrawer.Form>
    </>
  );
};

export const SkillEdit = () => {
  const { workspaceSlug } = useWorkspaceParams();
  const { skillId } = useParams<{ skillId: string }>();
  return (
    <RouteDrawer prev={`/${workspaceSlug}/skills/${skillId}`}>
      <SkillEditInner />
    </RouteDrawer>
  );
};

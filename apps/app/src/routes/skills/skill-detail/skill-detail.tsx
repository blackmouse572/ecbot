import { useDeleteSkill, useGetSkill } from "@/hooks/api/skills";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { PencilSquare, SquareTwoStack, Trash } from "@medusajs/icons";
import {
  Badge,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import {
  ActionMenu,
  SingleColumnPageSkeleton,
} from "@repo/ui/common-components";
import { SingleColumnPage } from "@repo/ui/layout";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { SkillInstructionsSection } from "./components/skill-instructions-section";
import { SkillMetaSection } from "./components/skill-meta-section";

export function SkillDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const { skillId } = useParams<{ skillId: string }>();

  const { skill, isLoading, isError, error } = useGetSkill(
    workspaceSlug,
    skillId ?? "",
    { enabled: !!skillId },
  );
  const { deleteSkill } = useDeleteSkill(workspaceSlug);
  const prompt = usePrompt();

  if (isLoading || !skill) {
    return <SingleColumnPageSkeleton sections={2} showJSON={false} />;
  }
  if (isError) {
    throw error;
  }

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("skills.delete.confirm.title"),
      description: t("skills.delete.confirm.description"),
      variant: "danger",
      confirmText: t("actions.delete"),
      cancelText: t("actions.cancel"),
    });
    if (!confirmed) return;
    try {
      await deleteSkill(skill.id);
      toast.success(t("skills.delete.success"));
      navigate(`/${workspaceSlug}/skills`);
    } catch {
      toast.error(t("skills.delete.error"));
    }
  };

  const copyAction = {
    icon: <SquareTwoStack />,
    label: t("actions.copy"),
    onClick: () => navigate("copy"),
  };

  const actionGroups = skill.isBuiltin
    ? [{ actions: [copyAction] }]
    : [
        {
          actions: [
            {
              icon: <PencilSquare />,
              label: t("actions.edit"),
              onClick: () => navigate("edit"),
            },
            copyAction,
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: handleDelete,
            },
          ],
        },
      ];

  return (
    <SingleColumnPage>
      <div className="flex flex-col gap-y-3">
        <Container className="divide-y p-0">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-x-2">
              <Heading>{skill.name}</Heading>
              <Badge size="2xsmall" color={skill.isBuiltin ? "purple" : "grey"}>
                {skill.isBuiltin
                  ? t("skills.builtin")
                  : t("skills.tabs.mySkills")}
              </Badge>
            </div>
            <ActionMenu groups={actionGroups} />
          </div>

          {skill.description && (
            <div className="flex flex-col gap-y-1 px-6 py-4">
              <Text size="small" weight="plus" className="text-ui-fg-subtle">
                {t("fields.description")}
              </Text>
              <Text size="small">{skill.description}</Text>
            </div>
          )}
        </Container>

        <SkillInstructionsSection skill={skill} />
        <SkillMetaSection item={skill} />
      </div>
    </SingleColumnPage>
  );
}

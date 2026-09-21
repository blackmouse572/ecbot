import { useGetSkill } from "@/hooks/api/skills";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Helmet } from "react-helmet-async";
import type { UIMatch } from "react-router-dom";
import { useParams } from "react-router-dom";

export function SkillDetailBreadcrumb(_props: UIMatch) {
  const { skillId } = useParams<{ skillId: string }>();
  const { workspaceSlug } = useWorkspaceParams();
  const { skill } = useGetSkill(workspaceSlug, skillId ?? "", {
    enabled: !!skillId,
  });

  return (
    <span>
      {skill?.name ?? skillId}
      {skill?.name && (
        <Helmet>
          <title>{skill.name} - Ecbot</title>
        </Helmet>
      )}
    </span>
  );
}

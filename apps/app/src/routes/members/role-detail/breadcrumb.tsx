import { useWorkspaceRole } from "@/hooks/api/workspace-roles";
import type { RoleGetResponseDto } from "@repo/client";
import { Helmet } from "react-helmet-async";
import { type UIMatch } from "react-router-dom";

type BreadcrumbProps = UIMatch<RoleGetResponseDto>;
export const Breadcrumb = (props: BreadcrumbProps) => {
  const { id } = props.params || {};
  const { role } = useWorkspaceRole(id!);

  if (!role) {
    return null;
  }

  return (
    <span>
      {role?.name}
      <Helmet>
        <title>{role.name} - Ecbot</title>
      </Helmet>
    </span>
  );
};

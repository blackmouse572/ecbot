import { useWorkspaceRole } from "@/hooks/api/workspace-roles";
import type { RoleGetResponseDto } from "@repo/client";
import { Helmet } from "react-helmet-async";
import { type UIMatch } from "react-router-dom";
import { useRoleLabel } from "../hooks/use-role-label";

type BreadcrumbProps = UIMatch<RoleGetResponseDto>;
export const Breadcrumb = (props: BreadcrumbProps) => {
  const { id } = props.params || {};
  const { role } = useWorkspaceRole(id!);
  const roleLabel = useRoleLabel();

  if (!role) {
    return null;
  }

  const { label } = roleLabel(role);

  return (
    <span>
      {label}
      <Helmet>
        <title>{label} - Ecbot</title>
      </Helmet>
    </span>
  );
};

import { useWorkspaceRole } from "@/hooks/api/workspace-roles";
import { TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { TwoColumnPage } from "@repo/ui/layout";
import { useParams } from "react-router-dom";
import { RoleGeneralSection } from "./role-general-section/role-general-section";
import { RolePermissionGrid } from "./role-permission-grid";
import { RoleSummarySection } from "./role-summary-section";

export const RoleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { role, isLoading } = useWorkspaceRole(id!);

  if (isLoading) {
    return <TwoColumnPageSkeleton />;
  }

  return (
    <TwoColumnPage>
      <TwoColumnPage.Main>
        <RoleGeneralSection role={role} />
        <RolePermissionGrid item={role} />
      </TwoColumnPage.Main>
      <TwoColumnPage.Sidebar>
        <RoleSummarySection role={role} />
      </TwoColumnPage.Sidebar>
    </TwoColumnPage>
  );
};

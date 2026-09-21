import { Heading } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router-dom";

import { useWorkspaceMember } from "@/hooks/api";
import { RouteDrawer } from "../../../components/modals";
import { MembersAssignRoleForm } from "./components/member-assign-role-form";

export const MembersAssignRoleEdit = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const { state } = useLocation();

  const { member, isLoading, isError, error } = useWorkspaceMember(id!);

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer prev={state?.prev}>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>
            {t("members.assignRole.title", "Assign Role to Member")}
          </Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t(
            "members.assignRole.description",
            "Select a role to assign to this member in the workspace.",
          )}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {!isLoading && member && <MembersAssignRoleForm item={member} />}
    </RouteDrawer>
  );
};

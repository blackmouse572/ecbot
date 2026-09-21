import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { AccountStatusCell } from "@/routes/accounts/accounts-list/components/account-list-table/account-status-cell";
import { ROUTES } from "@/routes/constants";
import { RoleTypeCell } from "@/routes/members/role-list/components/role-list-table/role-type-cell";
import { ArrowUpRightOnBox } from "@medusajs/icons";
import { Container, Divider, Heading, IconButton } from "@medusajs/ui";
import type { RoleListResponseDto } from "@repo/client";
import { Section, SectionRow } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type MemberSummarySectionProps = {
  item: RoleListResponseDto;
};

export const MemberRoleSection = ({ item }: MemberSummarySectionProps) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  return (
    <Container className="p-0">
      <div className="flex items-center gap-y-1 p-6 py-4 justify-between">
        <Heading>{t("roles.title")}</Heading>
        <Link
          to={`/${workspaceSlug}/${ROUTES.Settings}/${ROUTES.WorkspaceRoles}/${item.id}`}
        >
          <IconButton variant="transparent" size="small">
            <ArrowUpRightOnBox />
          </IconButton>
        </Link>
      </div>
      <Divider variant="dashed" />
      <Section variant="spaced">
        <SectionRow title={t("fields.name")} value={item.name} />
        <SectionRow
          title={t("fields.type")}
          value={<RoleTypeCell size="small" type={item.type} />}
        />
        <SectionRow
          title={t("roles.fields.permissions")}
          value={item.permissions.toString()}
        />
        <SectionRow
          title={t("fields.status")}
          value={
            <AccountStatusCell status={item.isActive ? "ACTIVE" : "INACTIVE"} />
          }
        />
      </Section>
    </Container>
  );
};

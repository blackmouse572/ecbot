import { Container, Divider, Heading, StatusBadge } from "@medusajs/ui";
import type { RoleGetResponseDto } from "@repo/client";
import { Section, SectionRow } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

type RoleSummarySectionProps = {
  role: RoleGetResponseDto;
};

export const RoleSummarySection = ({ role }: RoleSummarySectionProps) => {
  const { t } = useTranslation();

  return (
    <Container className="p-0">
      <div className="flex flex-col gap-y-1 p-6 py-4">
        <Heading>{t("chatbot.details.summary.title")}</Heading>
      </div>
      <Divider variant="dashed" />
      <Section variant="spaced">
        <SectionRow title={t("fields.name")} value={role.name} />
        {role.description && (
          <SectionRow
            title={t("fields.description")}
            value={role.description}
          />
        )}
        <SectionRow
          title={t("fields.status")}
          value={
            <StatusBadge color={role.isActive ? "green" : "grey"}>
              {role.isActive ? "Active" : "Inactive"}
            </StatusBadge>
          }
        />
        <SectionRow
          title={t("fields.type")}
          value={<StatusBadge color="grey">{role.type}</StatusBadge>}
        />
        <SectionRow
          title={t("roles.fields.permissions")}
          value={`${role.permissions.length} permissions`}
        />
        <SectionRow
          title={t("fields.createdAt")}
          value={new Date(role.createdAt).toLocaleDateString()}
        />
        <SectionRow
          title={t("fields.updatedAt")}
          value={new Date(role.updatedAt).toLocaleDateString()}
        />
      </Section>
    </Container>
  );
};

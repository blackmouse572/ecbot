import { Container, Heading, Text } from "@medusajs/ui";
import type { RoleGetResponseDto } from "@repo/client";
import { Section, SectionRow } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

type RoleSummarySectionProps = {
  role: RoleGetResponseDto;
};

export const RoleSummarySection = ({ role }: RoleSummarySectionProps) => {
  const { t } = useTranslation();

  return (
    <Container className="divide-y p-0 w-full">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Heading>
            {t("roles.summary.title", "Role")} {role?.name}
          </Heading>
        </div>
      </div>
      <Section variant="spaced">
        <SectionRow
          title={t("roles.summary.roleId", "Role ID")}
          value={role.id}
        />
        <SectionRow title={t("fields.name")} value={role.name} />
        <SectionRow
          title={t("roles.summary.type", "Type")}
          value={t(`roles.types.${role.type}`, role.type)}
        />
        <SectionRow
          title={t("fields.createdAt")}
          value={new Date(role.createdAt).toLocaleString()}
        />
        <SectionRow
          title={t("fields.updatedAt")}
          value={new Date(role.updatedAt).toLocaleString()}
        />
      </Section>
      {role.description && (
        <Section variant="spaced">
          <div className="flex flex-col gap-y-3 px-6 py-4">
            <Text weight="plus" size="small" className="text-ui-fg-base">
              {t("fields.description")}
            </Text>
            <Text size="small" className="text-ui-fg-subtle leading-relaxed">
              {role.description}
            </Text>
          </div>
        </Section>
      )}
    </Container>
  );
};

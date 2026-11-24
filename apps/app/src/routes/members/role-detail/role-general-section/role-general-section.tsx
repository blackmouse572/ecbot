import { Container, Heading, Switch, Text } from "@medusajs/ui";
import type { RoleGetResponseDto } from "@repo/client";
import { useTranslation } from "react-i18next";
import { useRoleLabel } from "../../hooks/use-role-label";

type RoleGeneralSectionProps = {
  role: RoleGetResponseDto;
};

export const RoleGeneralSection = ({ role }: RoleGeneralSectionProps) => {
  const { t } = useTranslation();
  const { label, description } = useRoleLabel()(role);

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Heading>{label}</Heading>
          {description && (
            <Text size="small" leading="compact" className="text-ui-fg-muted">
              {description}
            </Text>
          )}
        </div>
        <div className="flex items-center gap-x-4">
          <Switch
            checked={role.isActive}
            disabled // For now, make it read-only
            aria-label={t("Enable role")}
          />
        </div>
      </div>
    </Container>
  );
};

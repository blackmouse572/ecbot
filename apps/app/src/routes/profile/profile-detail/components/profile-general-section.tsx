import i18n from "@/i18n";
import { PencilSquare } from "@medusajs/icons";
import { Container, Heading, Text } from "@medusajs/ui";
import type { UserProfileResponseDto } from "@repo/client";
import { ActionMenu } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { UserStatusBadge } from "./user-status-badge";

export type ProfileGeneralSectionProps = {
  user: UserProfileResponseDto;
};
export const ProfileGeneralSection = ({ user }: ProfileGeneralSectionProps) => {
  const { t } = useTranslation();

  const { name, username, email, country, signUpDate, status, mobileNumber } =
    user;

  return (
    <Container>
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("profile.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("profile.manageYourProfileDetails")}
          </Text>
        </div>
        <ActionMenu
          groups={[
            {
              actions: [
                {
                  label: t("actions.edit"),
                  to: "edit",
                  icon: <PencilSquare />,
                },
              ],
            },
          ]}
        />
      </div>
      <div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.name")}
        </Text>
        <Text size="small" leading="compact">
          {name || "-"} ({username})
        </Text>
      </div>
      <div className="grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.email")}
        </Text>
        <Text size="small" leading="compact">
          {email}
        </Text>
      </div>
      <div className="grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("profile.fields.country")}
        </Text>
        <Text size="small" leading="compact">
          {country.name}
        </Text>
      </div>
      <div className="grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("profile.fields.phone")}
        </Text>
        <Text size="small" leading="compact">
          {mobileNumber?.number || "-"}
        </Text>
      </div>
      <div className="grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("fields.status")}
        </Text>
        <UserStatusBadge status={status}>{status}</UserStatusBadge>
      </div>
      <div className="grid grid-cols-2 items-center px-6 py-4">
        <Text size="small" leading="compact" weight="plus">
          {t("profile.fields.signUpDate")}
        </Text>
        <Text size="small" leading="compact">
          {new Intl.DateTimeFormat(i18n.language, {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: "UTC",
          }).format(new Date(signUpDate)) || "-"}
        </Text>
      </div>
    </Container>
  );
};

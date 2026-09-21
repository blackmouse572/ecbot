import {
  Button,
  Container,
  Heading,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import type { ProfileGeneralSectionProps } from "./profile-general-section";
import { useTranslation } from "react-i18next";
import { useDeleteProfile } from "@/hooks/api";

export const ProfileDeleteSection = ({ user }: ProfileGeneralSectionProps) => {
  const { t } = useTranslation();
  const { deleteProfile } = useDeleteProfile();
  const promt = usePrompt();

  const handleDeleteProfile = () => {
    promt({
      title: t("profile.deleteProfile.confirm.title"),
      description: t("profile.deleteProfile.confirm.description"),
      variant: "danger",
      confirmText: t("profile.deleteProfile.confirm.confirmButton"),
      verificationText: user.email,
    }).then((confirmed) => {
      if (!confirmed) return;
      return toast.promise(deleteProfile, {
        loading: t("profile.deleteProfile.confirm.loading"),
        success: t("profile.deleteProfile.confirm.success"),
        error: t("profile.deleteProfile.confirm.error"),
      });
    });
  };

  return (
    <Container className="border border-ui-border-danger">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>{t("profile.deleteProfile.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("profile.deleteProfile.description")}
          </Text>
        </div>
        <Button variant="danger" onClick={handleDeleteProfile}>
          {t("profile.deleteProfile.confirm.confirmButton")}
        </Button>
      </div>
    </Container>
  );
};

import { RouteDrawer } from "@/components/modals";
import { useMe } from "@/hooks/api";
import { Heading } from "@medusajs/ui";
import type { UserProfileResponseDto } from "@repo/client";
import { FormSkeleton } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { ProfileEditForm } from "./components/profile-edit-form";

export const ProfileEdit = () => {
  const { t } = useTranslation();
  const { user, isPending, isError, error } = useMe();

  if (isError) {
    throw error;
  }

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{t("profile.edit.title")}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {t("profile.manageYourProfileDetails")}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {isPending || !user ? (
        <RouteDrawer.Body className="p-6">
          <FormSkeleton label={t("general.loading")} />
        </RouteDrawer.Body>
      ) : (
        // SAFETY: outside a workspace, useMe reads the user profile.
        <ProfileEditForm user={user as UserProfileResponseDto} />
      )}
    </RouteDrawer>
  );
};

export const Component = ProfileEdit;

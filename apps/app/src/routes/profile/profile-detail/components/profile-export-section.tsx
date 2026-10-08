import { useExportMyData } from "@/hooks/api";
import { downloadJson } from "@/utils";
import { Button, Container, Heading, Text, toast } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

export const ProfileExportSection = () => {
  const { t } = useTranslation();
  const { mutateAsync, isPending } = useExportMyData();

  const handleExport = () =>
    toast.promise(
      mutateAsync().then((data) => downloadJson(data, "my-data.json")),
      {
        loading: t("profile.exportData.loading"),
        success: t("profile.exportData.success"),
        error: t("profile.exportData.error"),
      },
    );

  return (
    <Container>
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <div>
          <Heading>{t("profile.exportData.domain")}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("profile.exportData.description")}
          </Text>
        </div>
        <Button
          variant="secondary"
          onClick={handleExport}
          isLoading={isPending}
          disabled={isPending}
        >
          {t("profile.exportData.button")}
        </Button>
      </div>
    </Container>
  );
};

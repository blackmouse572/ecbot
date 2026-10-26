import {
  useApproveJoinRequest,
  useJoinRequests,
} from "@/hooks/api/join-requests";
import { Button, Container, Text, toast } from "@medusajs/ui";
import { NoRecords } from "@repo/ui/common-components";
import { SingleColumnPage } from "@repo/ui/layout";
import { IconUserCheck } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { ListSkeleton } from "@repo/ui/common-components";

export const JoinRequests = () => {
  const { t, i18n } = useTranslation();
  const { joinRequests, isLoading, isError, error } = useJoinRequests();
  const { mutateAsync: approve } = useApproveJoinRequest();

  const handleApprove = (id: string) =>
    toast.promise(approve(id), {
      loading: t("members.joinRequests.approve.loading"),
      success: t("members.joinRequests.approve.success"),
      error: t("errorBoundary.internalServerErrorMessage"),
    });

  if (isError) throw error;
  return (
    <SingleColumnPage>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Text weight="plus">{t("members.joinRequests.title")}</Text>
        </div>
        {isLoading ? (
          <ListSkeleton label={t("general.loading")} className="px-6 py-4" />
        ) : joinRequests && joinRequests.length > 0 ? (
          joinRequests.map((request) => (
            <div
              key={request.id}
              className="flex items-center justify-between gap-x-4 px-6 py-3"
            >
              <div className="flex flex-col gap-y-1">
                <Text size="small" weight="plus">
                  {request.requestFrom.name}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {request.requestFrom.email}
                </Text>
                {request.reason && (
                  <Text size="small" className="text-ui-fg-muted">
                    {request.reason}
                  </Text>
                )}
              </div>
              <div className="flex items-center gap-x-3">
                <Text size="small" className="text-ui-fg-muted">
                  {new Date(request.createdAt).toLocaleDateString(
                    i18n.language,
                  )}
                </Text>
                <Button
                  size="small"
                  variant="secondary"
                  onClick={() => handleApprove(request.id)}
                >
                  {t("members.joinRequests.approve.action")}
                </Button>
              </div>
            </div>
          ))
        ) : (
          <NoRecords
            title={t("members.joinRequests.emptyTitle")}
            message={t("members.joinRequests.empty")}
            icon={<IconUserCheck />}
          />
        )}
      </Container>
    </SingleColumnPage>
  );
};

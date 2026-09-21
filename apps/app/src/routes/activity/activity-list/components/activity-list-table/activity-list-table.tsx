import { useWorkspaceActivities } from "@/hooks/api/workspace-activities";
import { useAccountTableQuery } from "@/routes/accounts/accounts-list/components/account-list-table";
import { Container, Divider, Heading } from "@medusajs/ui";
import type { ActivityListResponseDto } from "@repo/client";
import { LoadMoreDivider } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { ActivityItemDefault } from "../activity-item/activity-item-default";

const PAGE_SIZE = 20;

export const ActivityListTable = () => {
  const { t } = useTranslation();

  const { searchParams } = useAccountTableQuery({ pageSize: PAGE_SIZE });
  const {
    activities,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useWorkspaceActivities({
    ...searchParams,
  });

  const renderItemDynamic = (item: ActivityListResponseDto) => {
    return <ActivityItemDefault key={item.id} item={item} />;
  };

  if (isError) {
    throw error;
  }

  return (
    <Container className="divide-y p-0 pb-8">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("activities.title")}</Heading>
      </div>
      <div className="px-8 pt-4 relative">
        <Divider
          orientation="vertical"
          className="absolute h-[80%] top-4 left-12 z-0 "
        />
        <div className="space-y-8 relative">
          {activities?.map((item) => renderItemDynamic(item))}

          {hasNextPage && (
            <LoadMoreDivider
              className="mt-4"
              onClick={() => fetchNextPage()}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
            >
              {t("general.loadMore")}
            </LoadMoreDivider>
          )}
        </div>
      </div>
      <Outlet />
    </Container>
  );
};

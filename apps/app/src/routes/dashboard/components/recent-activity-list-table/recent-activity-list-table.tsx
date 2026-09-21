import { useWorkspaceActivities } from "@/hooks/api/workspace-activities";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { useAccountTableQuery } from "@/routes/accounts/accounts-list/components/account-list-table";
import { ActivityItemDefault } from "@/routes/activity/activity-list/components/activity-item/activity-item-default";
import { ROUTES } from "@/routes/constants";
import { ArrowUpRightOnBox } from "@medusajs/icons";
import { Container, Divider, Heading, IconButton } from "@medusajs/ui";
import type { ActivityListResponseDto } from "@repo/client";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

const PAGE_SIZE = 20;

export const RecentActivityListTable = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { searchParams } = useAccountTableQuery({ pageSize: PAGE_SIZE });
  const { activities, isError, error } = useWorkspaceActivities({
    ...searchParams,
  });

  const renderItemDynamic = (item: ActivityListResponseDto) => {
    return <ActivityItemDefault key={item.id} item={item} />;
  };

  if (isError) {
    throw error;
  }

  return (
    <Container className="divide-y p-0 pb-4">
      <div className="flex items-center justify-between px-5 py-4">
        <Heading level="h2">{t("dashboard.recentActivities")}</Heading>
        <IconButton asChild variant="transparent">
          <Link to={`/${workspaceSlug}/${ROUTES.Activities}`}>
            <ArrowUpRightOnBox />
          </Link>
        </IconButton>
      </div>
      <div className="px-4 pt-2 relative">
        <Divider
          orientation="vertical"
          className="absolute top-2 left-8 z-0 "
        />
        <div className="space-y-8 relative max-h-[400px] overflow-y-auto">
          {activities?.map((item) => renderItemDynamic(item))}
        </div>
      </div>
    </Container>
  );
};

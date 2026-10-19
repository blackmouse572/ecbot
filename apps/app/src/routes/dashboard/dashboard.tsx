import { useWorkspaceAnalytics } from "@/hooks/api/workspace-analytics";
import { Container, Text } from "@medusajs/ui";
import { SingleColumnPage } from "@repo/ui/layout";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { enterpriseDashboardAlerts } from "../enterprise.dashboard-alert";
import { GettingStarted, RecentActivityListTable } from "./components";
import {
  AnalyticsKpis,
  AnalyticsTabs,
  AnalyticsToolbar,
  CustomerTagsSection,
  UnhappyCustomers,
} from "./components/analytics";
import { useAnalyticsParams } from "./hooks/use-analytics-params";
import { useAnalyticsTabs } from "./hooks/use-analytics-tabs";
import { LOADING_ANALYTICS } from "./constants";

export function Dashboard() {
  const { t } = useTranslation();
  const tabs = useAnalyticsTabs();
  const { range, setRange, tab, setTab } = useAnalyticsParams(tabs);
  const analytics = useWorkspaceAnalytics(range, tabs);
  const data = analytics.data;
  const loadingTab = (tab: (typeof tabs)[number]) =>
    analytics.isLoading && tabs.includes(tab);

  return (
    <SingleColumnPage hasOutlet={false}>
      <Helmet>
        <title>{t("app.nav.dashboard.header")} - Ecbot</title>
      </Helmet>
      {enterpriseDashboardAlerts().map((Alert, index) => (
        <Alert key={index} />
      ))}
      <GettingStarted />
      <AnalyticsToolbar
        range={range}
        onRangeChange={setRange}
        generatedAt={analytics.generatedAt}
        onRefresh={() => analytics.refetch()}
        isRefreshing={analytics.isFetching}
      />
      {analytics.isError ? (
        <Container>
          <Text size="small" className="text-ui-fg-error">
            {t("dashboard.analytics.error")}
          </Text>
        </Container>
      ) : (
        <AnalyticsKpis
          data={data}
          tabs={tabs}
          isLoading={analytics.isLoading}
        />
      )}
      <AnalyticsTabs
        data={data}
        tabs={tabs}
        tab={tab}
        onTabChange={setTab}
        isLoading={analytics.isLoading}
        sidebar={
          <>
            {(data.marketing || loadingTab("marketing")) && (
              <UnhappyCustomers
                rows={data.marketing?.unhappy ?? []}
                isLoading={!data.marketing}
              />
            )}
            {(data.customers || loadingTab("customers")) && (
              <CustomerTagsSection
                data={data.customers ?? LOADING_ANALYTICS.customers}
                isLoading={!data.customers}
              />
            )}
            <RecentActivityListTable />
          </>
        }
      />
    </SingleColumnPage>
  );
}

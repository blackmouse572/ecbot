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

export function Dashboard() {
  const { t } = useTranslation();
  const tabs = useAnalyticsTabs();
  const { range, setRange, tab, setTab } = useAnalyticsParams(tabs);
  const analytics = useWorkspaceAnalytics(range, tabs);
  const data = analytics.data;

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
        sidebar={
          <>
            {data.marketing && (
              <UnhappyCustomers rows={data.marketing.unhappy} />
            )}
            {data.customers && <CustomerTagsSection data={data.customers} />}
            <RecentActivityListTable />
          </>
        }
      />
    </SingleColumnPage>
  );
}

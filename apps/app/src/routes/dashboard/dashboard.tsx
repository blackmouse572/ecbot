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
  const allowed = useAnalyticsTabs();
  // Usage is a stat that opens its own page, not a tab.
  const tabs = allowed.filter((v) => v !== "usage");
  const { range, setRange, tab, setTab } = useAnalyticsParams(tabs);
  const analytics = useWorkspaceAnalytics(range);
  const data = analytics.data;
  // Usage is counted only where the edition meters it.
  const usage = allowed.includes("usage") ? data?.usage : undefined;

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
        generatedAt={data?.generatedAt}
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
          tabs={allowed}
          isLoading={analytics.isLoading}
          usage={usage}
        />
      )}
      <AnalyticsTabs
        data={data}
        tabs={tabs}
        tab={tab}
        onTabChange={setTab}
        sidebar={
          <>
            {data && tabs.includes("marketing") && (
              <UnhappyCustomers rows={data.unhappy} />
            )}
            {data && allowed.includes("customers") && (
              <CustomerTagsSection data={data.customers} />
            )}
            <RecentActivityListTable />
          </>
        }
      />
    </SingleColumnPage>
  );
}

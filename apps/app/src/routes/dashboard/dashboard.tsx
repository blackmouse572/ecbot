import { SingleColumnPage } from "@repo/ui/layout";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { RecentActivityListTable } from "./components";
import { StatsContainer } from "./components/stats-container";
import { StatsItem } from "./components/stats-item";
import { useStatsData } from "./hooks/use-stats-data";

export function Dashboard() {
  const { t } = useTranslation();
  const data = useStatsData();
  return (
    <SingleColumnPage hasOutlet={false}>
      <Helmet>
        <title>{t("app.nav.dashboard.header")} - Ecbot</title>
      </Helmet>
      <StatsContainer>
        {data.map((item) => (
          <StatsItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            value={item.value}
          />
        ))}
      </StatsContainer>
      <RecentActivityListTable />
    </SingleColumnPage>
  );
}

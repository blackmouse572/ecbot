import { SingleColumnPage, TwoColumnPage } from "@repo/ui/layout";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { RecentActivityListTable } from "./components";
import { ChatbotRadialChat } from "./components/chatbot-radial-chart/chatbot-radial-chart";
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
        {data.map((item, index) => (
          <StatsItem
            key={index}
            icon={item.icon}
            label={item.label}
            value={item.value}
            trend={item.trend}
          />
        ))}
      </StatsContainer>
      <TwoColumnPage>
        <TwoColumnPage.Main>
          <div className="grid grid-cols-2">
            <ChatbotRadialChat />
          </div>
        </TwoColumnPage.Main>
        <TwoColumnPage.Sidebar>
          <RecentActivityListTable />
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </SingleColumnPage>
  );
}

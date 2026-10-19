import type {
  AnalyticsTab,
  WorkspaceAnalytics,
} from "@/hooks/api/workspace-analytics";
import { Tabs } from "@medusajs/ui";
import { TwoColumnPage } from "@repo/ui/layout";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BotSection } from "./bot-section";
import { ConversionSection } from "./conversion-section";
import { CustomersSection } from "./customers-section";
import { MarketingSection } from "./marketing-section";
import { ScrollShadowRow } from "./scroll-shadow-row";

type AnalyticsTabsProps = {
  data?: WorkspaceAnalytics;
  tabs: AnalyticsTab[];
  tab?: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
  /** The right-hand column next to the tab content. */
  sidebar: ReactNode;
};

/** The tab row across the page, then two columns: the open tab on the left,
 * `sidebar` on the right. */
export const AnalyticsTabs: FC<AnalyticsTabsProps> = ({
  data,
  tabs,
  tab,
  onTabChange,
  sidebar,
}) => {
  const { t } = useTranslation();
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => onTabChange(value as AnalyticsTab)}
      className="flex flex-col gap-y-3"
    >
      {tabs.length > 0 && (
        <ScrollShadowRow>
          <Tabs.List className="w-max pb-1">
            {tabs.map((value) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="shrink-0 whitespace-nowrap"
              >
                {t(`dashboard.analytics.tabs.${value}`)}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </ScrollShadowRow>
      )}
      <TwoColumnPage hasOutlet={false}>
        <TwoColumnPage.Main>
          {data && (
            <>
              <Tabs.Content value="conversion">
                <ConversionSection
                  data={data.conversion}
                  showTokens={tabs.includes("usage")}
                />
              </Tabs.Content>
              <Tabs.Content value="marketing">
                <MarketingSection data={data.marketing} />
              </Tabs.Content>
              <Tabs.Content value="bot">
                <BotSection data={data.bot} />
              </Tabs.Content>
              <Tabs.Content value="customers">
                <CustomersSection data={data.customers} />
              </Tabs.Content>
            </>
          )}
        </TwoColumnPage.Main>
        <TwoColumnPage.Sidebar>{sidebar}</TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </Tabs>
  );
};

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
import { LOADING_ANALYTICS } from "../../constants";

type AnalyticsTabsProps = {
  data?: WorkspaceAnalytics;
  tabs: AnalyticsTab[];
  tab?: AnalyticsTab;
  onTabChange: (tab: AnalyticsTab) => void;
  /** Sections still loading render with placeholders at full height. */
  isLoading?: boolean;
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
  isLoading,
  sidebar,
}) => {
  const { t } = useTranslation();
  const section = <K extends AnalyticsTab>(key: K) =>
    data?.[key] ?? (isLoading ? LOADING_ANALYTICS[key] : undefined);
  const conversion = section("conversion");
  const marketing = section("marketing");
  const bot = section("bot");
  const customers = section("customers");
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
          {conversion && (
            <Tabs.Content value="conversion">
              <ConversionSection
                data={conversion}
                isLoading={!data?.conversion}
              />
            </Tabs.Content>
          )}
          {marketing && (
            <Tabs.Content value="marketing">
              <MarketingSection data={marketing} isLoading={!data?.marketing} />
            </Tabs.Content>
          )}
          {bot && (
            <Tabs.Content value="bot">
              <BotSection data={bot} isLoading={!data?.bot} />
            </Tabs.Content>
          )}
          {customers && (
            <Tabs.Content value="customers">
              <CustomersSection data={customers} isLoading={!data?.customers} />
            </Tabs.Content>
          )}
        </TwoColumnPage.Main>
        <TwoColumnPage.Sidebar>{sidebar}</TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </Tabs>
  );
};

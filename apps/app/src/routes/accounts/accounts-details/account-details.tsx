import { useAccount } from "@/hooks/api";
import { TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { SingleColumnPage, TwoColumnPage } from "@repo/ui/layout";
import { useLoaderData, useParams } from "react-router-dom";
import { AccountAlertSection } from "./components/account-alert-section/account-alert-section";
import { AccountApiChannelSection } from "./components/account-api-channel-section/account-api-channel-section";
import { AccountChatbotSection } from "./components/account-chatbot-section/account-chatbot-section";
import { AccountGeneralSection } from "./components/account-general-section/account-general-section";
import { AccountSummarySection } from "./components/account-summary-section/account-summary-section";
import { AccountWebsiteWidgetSection } from "./components/account-website-widget-section/account-website-widget-section";
import type { accountDetailsLoader } from "./loader";

export function AccountDetails() {
  const initialData = useLoaderData() as Awaited<
    ReturnType<typeof accountDetailsLoader>
  >;

  const { id } = useParams();
  const { account, isLoading, isError, error } = useAccount(id!, {
    initialData: initialData,
  });

  if (isLoading || !account) {
    return (
      <TwoColumnPageSkeleton
        mainSections={4}
        sidebarSections={3}
        showJSON
        showMetadata
      />
    );
  }

  if (isError) {
    throw error;
  }
  return (
    <SingleColumnPage>
      <TwoColumnPage
        hasOutlet={false}
        sidebarProps={{ className: "size-full md:size-auto" }}
      >
        <TwoColumnPage.Main>
          <AccountGeneralSection item={account} />
          <AccountSummarySection item={account} />
          <AccountApiChannelSection item={account} />
          <AccountWebsiteWidgetSection item={account} />
        </TwoColumnPage.Main>
        <TwoColumnPage.Sidebar>
          <AccountAlertSection item={account} />
          <AccountChatbotSection accountId={account.id} />
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </SingleColumnPage>
  );
}

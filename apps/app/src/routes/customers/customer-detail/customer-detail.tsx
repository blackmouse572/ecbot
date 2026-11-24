import { useContactPointsByCustomer } from "@/hooks/api/contact-points";
import { useConversations } from "@/hooks/api/conversations";
import { useCustomer } from "@/hooks/api/customers";
import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { useOrders } from "@/hooks/api/orders";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { ContactPointsList } from "@/routes/conversations/customer-side-panel/components/contact-points-list";
import { ConversationsSection } from "@/routes/conversations/customer-side-panel/components/conversations-section";
import { CustomerEditDrawer } from "@/routes/conversations/customer-side-panel/components/customer-edit-drawer";
import { DetailRow } from "@/routes/conversations/customer-side-panel/components/detail-row";
import { MarketingSection } from "@/routes/conversations/customer-side-panel/components/marketing-section";
import { OrdersSection } from "@/routes/conversations/customer-side-panel/components/orders-section";
import { SavedFieldsSection } from "@/routes/conversations/customer-side-panel/components/saved-fields-section";
import { TagsSection } from "@/routes/conversations/customer-side-panel/components/tags-section";
import { PencilSquare, Sparkles } from "@medusajs/icons";
import { Button, Container, Heading, Tabs, Text } from "@medusajs/ui";
import { Can, useAbility } from "@repo/auth";
import { TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { SingleColumnPage, TwoColumnPage } from "@repo/ui/layout";
import { useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CustomerActivity } from "./components/customer-activity";
import { CustomerStats } from "./components/customer-stats";
import { CustomerUpcoming } from "./components/customer-upcoming";
import { CUSTOMER_DETAIL_TABS } from "./constants";
import { CustomerDetailHead } from "./customer-detail-head";
import { useCustomerTab } from "./use-customer-tab";

const PANEL = "conversations.customer.panel";

/**
 * One customer in one place: what happened and what comes next on the left,
 * who they are on the right, in the same blocks as the conversation panel.
 */
export function CustomerDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const ability = useAbility();
  const [tab, openTab] = useCustomerTab();
  const { workspaceSlug } = useWorkspaceParams();
  const { customerId = "" } = useParams<{ customerId: string }>();
  const { customer, isLoading, isError, error } = useCustomer(customerId);
  const { contactPoints } = useContactPointsByCustomer(customerId);
  // Same query as the conversations list, so the page makes one request.
  const { conversations } = useConversations({
    customer: customerId,
    perPage: 100,
    orderBy: "lastMessageAt",
    orderDirection: "DESC",
  });
  const showOrders = flags.orders && ability.can("read", "ORDER");
  const { count: orderCount } = useOrders(
    workspaceSlug,
    { customer: customerId, perPage: 100 },
    { enabled: showOrders },
  );
  const [editing, setEditing] = useState(false);

  if (isError) {
    throw error;
  }

  if (isLoading || !customer) {
    return <TwoColumnPageSkeleton mainSections={3} sidebarSections={3} />;
  }

  // A merged profile lives on in the customer it was merged into.
  if (customer.mergedIntoCustomerId) {
    return (
      <Navigate
        to={`/${workspaceSlug}/${ROUTES.Customers}/${customer.mergedIntoCustomerId}`}
        replace
      />
    );
  }

  const counts: Partial<Record<(typeof CUSTOMER_DETAIL_TABS)[number], number>> =
    { conversations: conversations.length, orders: orderCount };
  const tabs = CUSTOMER_DETAIL_TABS.filter(
    (value) => value !== "orders" || showOrders,
  );

  return (
    <SingleColumnPage>
      <Tabs
        value={tab}
        onValueChange={openTab}
        className="flex flex-col gap-y-3"
      >
        <CustomerDetailHead
          customer={customer}
          contactPoints={contactPoints}
          conversations={conversations}
          onErased={() =>
            navigate(`/${workspaceSlug}/${ROUTES.Customers}`, { replace: true })
          }
        >
          <Tabs.List>
            {tabs.map((value) => (
              <Tabs.Trigger key={value} value={value}>
                {t(`customers.detail.tabs.${value}`)}
                {!!counts[value] && (
                  <span className="text-ui-fg-muted ml-1.5 tabular-nums">
                    {counts[value]}
                  </span>
                )}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </CustomerDetailHead>

        <TwoColumnPage hasOutlet={false}>
          <TwoColumnPage.Main>
            <Tabs.Content value="overview" className="flex flex-col gap-y-3">
              <CustomerStats customerId={customerId} />
              <CustomerUpcoming customerId={customerId} />
              <CustomerActivity customerId={customerId} />
            </Tabs.Content>
            <Tabs.Content value="conversations">
              <Container className="px-6 py-4">
                <ConversationsSection customerId={customerId} />
              </Container>
            </Tabs.Content>
            {showOrders && (
              <Tabs.Content value="orders">
                <Container className="px-6 py-4">
                  <OrdersSection customerId={customerId} />
                </Container>
              </Tabs.Content>
            )}
            <Tabs.Content value="marketing">
              <CustomerActivity customerId={customerId} only="marketing" />
            </Tabs.Content>
          </TwoColumnPage.Main>

          {/* The conversation panel's blocks, in one card, beside every tab. */}
          <TwoColumnPage.Sidebar>
            <Container className="divide-y p-0">
              {customer.profileSummary && (
                <Section
                  title={
                    <span className="flex items-center gap-x-1.5">
                      <Sparkles className="text-ui-tag-purple-icon" />
                      {t("customers.detail.profileSummary")}
                    </span>
                  }
                >
                  <Text
                    size="small"
                    className="text-ui-fg-subtle whitespace-pre-line"
                  >
                    {customer.profileSummary}
                  </Text>
                </Section>
              )}

              <Section
                title={t(`${PANEL}.details`)}
                action={
                  <Can I="update" a="CUSTOMER">
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={() => setEditing(true)}
                    >
                      <PencilSquare />
                      {t("actions.edit")}
                    </Button>
                  </Can>
                }
              >
                <div className="flex flex-col gap-y-2.5">
                  <DetailRow
                    label={t(`${PANEL}.fields.name`)}
                    value={customer.name}
                  />
                  <DetailRow
                    label={t(`${PANEL}.fields.phone`)}
                    value={customer.phone}
                  />
                  <DetailRow
                    label={t(`${PANEL}.fields.email`)}
                    value={customer.email}
                  />
                  <DetailRow
                    label={t(`${PANEL}.fields.language`)}
                    value={customer.language}
                  />
                  <SavedFieldsSection fields={customer.metadata} />
                  <DetailRow
                    label={t(`${PANEL}.fields.notes`)}
                    value={customer.notes}
                  />
                </div>
              </Section>

              <Section title={t(`${PANEL}.tags.title`)}>
                <TagsSection customerId={customerId} />
              </Section>

              <Section
                title={t(`${PANEL}.contactPoints.title`)}
                action={
                  <Text size="small" className="text-ui-fg-muted">
                    {t(`${PANEL}.contactPoints.count`, {
                      count: contactPoints.length,
                    })}
                  </Text>
                }
              >
                <ContactPointsList
                  customerId={customer.id}
                  contactPoints={contactPoints}
                />
              </Section>

              <div className="px-6 py-4">
                <MarketingSection
                  customerId={customerId}
                  customerName={customer.name}
                />
              </div>
            </Container>
          </TwoColumnPage.Sidebar>
        </TwoColumnPage>
      </Tabs>
      <CustomerEditDrawer
        customerId={customerId}
        customer={customer}
        open={editing}
        onOpenChange={setEditing}
      />
    </SingleColumnPage>
  );
}

const Section: FC<{
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}> = ({ title, action, children }) => (
  <section className="flex flex-col gap-y-3 px-6 py-4">
    <div className="flex items-center justify-between gap-x-2">
      <Heading level="h3">{title}</Heading>
      {action}
    </div>
    {children}
  </section>
);

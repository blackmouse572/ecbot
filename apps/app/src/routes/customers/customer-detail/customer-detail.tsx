import { useContactPointsByCustomer } from "@/hooks/api/contact-points";
import { useConversations } from "@/hooks/api/conversations";
import { useCustomer } from "@/hooks/api/customers";
import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { ContactPointsList } from "@/routes/conversations/customer-side-panel/components/contact-points-list";
import { ConversationsSection } from "@/routes/conversations/customer-side-panel/components/conversations-section";
import { CustomerEditDrawer } from "@/routes/conversations/customer-side-panel/components/customer-edit-drawer";
import { DetailRow } from "@/routes/conversations/customer-side-panel/components/detail-row";
import { CustomerFollowupsSection } from "@/routes/conversations/customer-side-panel/components/followups-section";
import { MarketingSection } from "@/routes/conversations/customer-side-panel/components/marketing-section";
import { OrdersSection } from "@/routes/conversations/customer-side-panel/components/orders-section";
import { SavedFieldsSection } from "@/routes/conversations/customer-side-panel/components/saved-fields-section";
import { TagsSection } from "@/routes/conversations/customer-side-panel/components/tags-section";
import { PencilSquare } from "@medusajs/icons";
import { Container, Heading, IconButton, Text } from "@medusajs/ui";
import { Can } from "@repo/auth";
import { TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { TwoColumnPage } from "@repo/ui/layout";
import { useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { CustomerDetailHead } from "./customer-detail-head";

/** One customer in one place: their history on the left, who they are on the right. */
export function CustomerDetail() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { flags } = useFeatureFlags();
  const { workspaceSlug } = useWorkspaceParams();
  const { customerId = "" } = useParams<{ customerId: string }>();
  const { customer, isLoading, isError, error } = useCustomer(customerId);
  const { contactPoints } = useContactPointsByCustomer(customerId);
  // Same query as the Cuộc trò chuyện list below, so both share one request.
  const { conversations } = useConversations({
    customer: customerId,
    perPage: 100,
    orderBy: "lastMessageAt",
    orderDirection: "DESC",
  });
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

  const conversationHref = (id: string) =>
    `/${workspaceSlug}/${ROUTES.Conversations}/${id}`;

  return (
    <div className="flex w-full flex-col gap-y-3">
      <CustomerDetailHead
        customer={customer}
        contactPoints={contactPoints}
        conversations={conversations}
        onErased={() =>
          navigate(`/${workspaceSlug}/${ROUTES.Customers}`, { replace: true })
        }
      />

      <TwoColumnPage>
        <TwoColumnPage.Main>
          <Can I="read" a="CONVERSATION">
            <Section
              title={t("conversations.customer.panel.conversations.title")}
            >
              <ConversationsSection customerId={customerId} />
            </Section>
          </Can>
          {flags.orders && (
            <Can I="read" a="ORDER">
              <Section>
                <OrdersSection customerId={customerId} />
              </Section>
            </Can>
          )}
          <Can I="read" a="CONVERSATION">
            <Section title={t("customers.detail.followups")}>
              <CustomerFollowupsSection
                customerId={customerId}
                onViewMessage={(followup) =>
                  navigate(conversationHref(followup.conversationId))
                }
              />
            </Section>
          </Can>
        </TwoColumnPage.Main>

        <TwoColumnPage.Sidebar>
          <Section
            title={t("conversations.customer.panel.details")}
            action={
              <Can I="update" a="CUSTOMER">
                <IconButton
                  size="small"
                  variant="transparent"
                  onClick={() => setEditing(true)}
                  aria-label={t("actions.edit")}
                >
                  <PencilSquare />
                </IconButton>
              </Can>
            }
          >
            <div className="flex flex-col gap-y-2.5">
              <DetailRow
                label={t("conversations.customer.panel.fields.phone")}
                value={customer.phone}
              />
              <DetailRow
                label={t("conversations.customer.panel.fields.email")}
                value={customer.email}
              />
              <DetailRow
                label={t("conversations.customer.panel.fields.language")}
                value={customer.language}
              />
              <SavedFieldsSection fields={customer.metadata} />
              <DetailRow
                label={t("conversations.customer.panel.fields.notes")}
                value={customer.notes}
              />
            </div>
          </Section>
          <CustomerEditDrawer
            customerId={customerId}
            customer={customer}
            open={editing}
            onOpenChange={setEditing}
          />

          {customer.profileSummary && (
            <Section title={t("customers.detail.profileSummary")}>
              <Text
                size="small"
                className="text-ui-fg-subtle whitespace-pre-line"
              >
                {customer.profileSummary}
              </Text>
            </Section>
          )}

          <Section title={t("conversations.customer.panel.tags.title")}>
            <TagsSection customerId={customerId} />
          </Section>

          <Section
            title={t("conversations.customer.panel.contactPoints.title")}
          >
            <ContactPointsList contactPoints={contactPoints} />
          </Section>

          <Section>
            <MarketingSection
              customerId={customerId}
              customerName={customer.name}
            />
          </Section>
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </div>
  );
}

const Section: FC<{
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}> = ({ title, action, children }) => (
  <Container className="flex flex-col gap-y-3 px-6 py-4">
    {title && (
      <div className="flex items-center justify-between gap-x-2">
        <Heading level="h2">{title}</Heading>
        {action}
      </div>
    )}
    {children}
  </Container>
);

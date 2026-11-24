import { useContactPointsByCustomer } from "@/hooks/api/contact-points";
import { useCustomer } from "@/hooks/api/customers";
import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { ContactPointsList } from "./components/contact-points-list";
import { ConversationsSection } from "./components/conversations-section";
import { CustomerActions } from "./components/customer-actions";
import { CustomerEditDrawer } from "./components/customer-edit-drawer";
import { DetailRow } from "./components/detail-row";
import { FoldedSection } from "./components/folded-section";
import { FollowupsSection } from "./components/followups-section";
import { MarketingSection } from "./components/marketing-section";
import { OrdersSection } from "./components/orders-section";
import { SavedFieldsSection } from "./components/saved-fields-section";
import { TagsSection } from "./components/tags-section";
import { TimezoneSection } from "./components/timezone-section";
import { Accordion } from "@repo/ui/components";
import {
  ArrowLeft,
  ArrowUpRightOnBox,
  ChevronDoubleLeft,
  ChevronDoubleRight,
  PencilSquare,
} from "@medusajs/icons";
import { Heading, IconButton, Tooltip } from "@medusajs/ui";
import { Skeleton } from "@repo/ui/common-components";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

// Which folded sections the operator keeps open, remembered per browser.
const OPEN_SECTIONS_KEY = "conversations.customerPanel.openSections";

const readOpenSections = (): string[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(OPEN_SECTIONS_KEY) ?? "[]");

    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

interface Props {
  customerId: string | undefined | null;
  conversationId?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onViewMessage?: (messageId: string) => void;
  // Small screens: the panel is a full screen stacked over the thread, so it
  // shows a back button instead of the collapse control.
  onBack?: () => void;
  // Called after the customer and their conversations were erased, so the
  // page can leave a conversation that no longer exists.
  onCustomerErased?: () => void;
}

export function CustomerSidePanel({
  customerId,
  conversationId,
  isOpen = true,
  onToggle,
  onViewMessage,
  onBack,
  onCustomerErased,
}: Props) {
  const { t } = useTranslation();
  const { flags } = useFeatureFlags();
  const { workspaceSlug } = useWorkspaceParams();
  const { customer, isLoading } = useCustomer(customerId);
  const { contactPoints } = useContactPointsByCustomer(customerId);
  const [editing, setEditing] = useState(false);
  const [openSections, setOpenSections] = useState(readOpenSections);

  const handleOpenSections = (value: string[]) => {
    setOpenSections(value);
    try {
      localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify(value));
    } catch {
      /* ignore persistence failures */
    }
  };

  if (!customerId) return null;

  if (!isOpen) {
    return (
      <aside className="border-ui-border-base bg-ui-bg-subtle flex w-10 shrink-0 flex-col items-center border-l py-3">
        <IconButton
          size="small"
          variant="transparent"
          onClick={onToggle}
          aria-label={t("conversations.customer.panel.expand")}
        >
          <ChevronDoubleLeft />
        </IconButton>
      </aside>
    );
  }

  return (
    <aside className="border-ui-border-base bg-ui-bg-subtle flex h-full w-full flex-col overflow-y-auto border-l">
      <div className="border-ui-border-base border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          {onBack && (
            <IconButton
              size="small"
              variant="transparent"
              onClick={onBack}
              aria-label={t("actions.back")}
            >
              <ArrowLeft />
            </IconButton>
          )}
          <Heading level="h3">
            {t("conversations.customer.panel.title")}
          </Heading>
        </div>
        <div className="flex items-center gap-x-1">
          <Tooltip content={t("customers.detail.open")}>
            <IconButton size="small" variant="transparent" asChild>
              <Link
                to={`/${workspaceSlug}/${ROUTES.Customers}/${customerId}`}
                aria-label={t("customers.detail.open")}
              >
                <ArrowUpRightOnBox />
              </Link>
            </IconButton>
          </Tooltip>
          {!onBack && (
            <IconButton
              size="small"
              variant="transparent"
              onClick={onToggle}
              aria-label={t("conversations.customer.panel.collapse")}
            >
              <ChevronDoubleRight />
            </IconButton>
          )}
          <CustomerActions
            customerId={customerId}
            customerName={customer?.name}
            onErased={onCustomerErased}
          />
        </div>
      </div>

      {isLoading && !customer ? (
        <div className="flex flex-col gap-y-3 px-4 py-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-2/3" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-y-2.5 px-4 py-4">
            <div className="flex items-center justify-between gap-x-2">
              <Heading level="h3">
                {t("conversations.customer.panel.details")}
              </Heading>
              <IconButton
                size="small"
                variant="transparent"
                onClick={() => setEditing(true)}
                aria-label={t("actions.edit")}
              >
                <PencilSquare />
              </IconButton>
            </div>
            <DetailRow
              label={t("conversations.customer.panel.fields.name")}
              value={customer?.name}
            />
            <DetailRow
              label={t("conversations.customer.panel.fields.phone")}
              value={customer?.phone}
            />
            <DetailRow
              label={t("conversations.customer.panel.fields.email")}
              value={customer?.email}
            />
            <DetailRow
              label={t("conversations.customer.panel.fields.language")}
              value={customer?.language}
            />
            <SavedFieldsSection fields={customer?.metadata} />
            <DetailRow
              label={t("conversations.customer.panel.fields.notes")}
              value={customer?.notes}
            />
          </div>
          <CustomerEditDrawer
            customerId={customerId}
            customer={customer}
            open={editing}
            onOpenChange={setEditing}
          />

          <div className="border-ui-border-base border-t px-4 py-4">
            <Heading level="h3" className="mb-2">
              {t("conversations.customer.panel.tags.title")}
            </Heading>
            <TagsSection customerId={customerId} />
          </div>

          <div className="border-ui-border-base border-t px-4 py-4">
            <Heading level="h3" className="mb-2">
              {t("conversations.customer.panel.contactPoints.title")}
            </Heading>
            <ContactPointsList
              customerId={customer.id}
              contactPoints={contactPoints}
            />
          </div>

          <div className="border-ui-border-base border-t px-4 py-4">
            <MarketingSection
              customerId={customerId}
              customerName={customer?.name}
              conversationId={conversationId}
              onViewMessage={onViewMessage}
            />
            {flags.orders && <OrdersSection customerId={customerId} />}
          </div>

          {conversationId && (
            <div className="border-ui-border-base border-t px-4 py-4">
              <TimezoneSection conversationId={conversationId} />
            </div>
          )}

          {conversationId && (
            // Looked at now and then, so folded until opened.
            <Accordion
              type="multiple"
              value={openSections}
              onValueChange={handleOpenSections}
              className="border-ui-border-base border-t"
            >
              <FoldedSection
                value="followups"
                title={t("conversations.customer.panel.followups.title")}
              >
                <FollowupsSection
                  conversationId={conversationId}
                  onViewMessage={onViewMessage}
                />
              </FoldedSection>
              <FoldedSection
                value="conversations"
                title={t("conversations.customer.panel.conversations.title")}
              >
                <ConversationsSection
                  customerId={customerId}
                  conversationId={conversationId}
                />
              </FoldedSection>
            </Accordion>
          )}
        </>
      )}
    </aside>
  );
}

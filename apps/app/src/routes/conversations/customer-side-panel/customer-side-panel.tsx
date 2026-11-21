import {
  useContactPointsByCustomer,
  type ContactPointGetResponseDto,
} from "@/hooks/api/contact-points";
import {
  useApplyCustomerTag,
  useCustomerTagAssignments,
  useRemoveCustomerTag,
  type CustomerTagAssignmentGetResponseDto,
} from "@/hooks/api/customer-tag-assignments";
import {
  useCustomerTagList,
  type CustomerTagGetResponseDto,
} from "@/hooks/api/customer-tags";
import {
  useCustomer,
  useEraseCustomer,
  useExportCustomer,
} from "@/hooks/api/customers";
import { downloadJson } from "@/utils";
import { useUnmergeCustomer } from "@/hooks/api/customer-merge-suggestions";
import { useFeatureFlags } from "@/hooks/api/feature-flags";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { ConversationsSection } from "./components/conversations-section";
import { CustomerEditDrawer } from "./components/customer-edit-drawer";
import { CustomerTagPicker } from "./components/customer-tag-picker";
import { DetailRow } from "./components/detail-row";
import { FoldedSection } from "./components/folded-section";
import { FollowupsSection } from "./components/followups-section";
import { MarketingSection } from "./components/marketing-section";
import { OrdersSection } from "./components/orders-section";
import { SavedFieldsSection } from "./components/saved-fields-section";
import { TimezoneSection } from "./components/timezone-section";
import { CUSTOMER_DATA_SUBJECT } from "../constants";
import { Can } from "@repo/auth";
import { Accordion } from "@repo/ui/components";
import { NoRecords } from "@repo/ui/common-components";
import { IconAddressBook, IconTag } from "@tabler/icons-react";
import {
  ArrowLeft,
  ChevronDoubleLeft,
  ChevronDoubleRight,
  EllipsisHorizontal,
  PencilSquare,
  XMarkMini,
} from "@medusajs/icons";
import {
  Badge,
  DropdownMenu,
  Heading,
  IconButton,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { Skeleton } from "@repo/ui/common-components";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

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
            <ContactPointsList contactPoints={contactPoints} />
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

function TagsSection({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const { assignments, isError } = useCustomerTagAssignments(customerId);
  const { tags: catalog } = useCustomerTagList();
  const apply = useApplyCustomerTag(customerId);
  const remove = useRemoveCustomerTag(customerId);

  const appliedTagIds = useMemo(
    () =>
      new Set(assignments.map((a) => a.tag?.id).filter(Boolean) as string[]),
    [assignments],
  );

  const isBusy = apply.isPending || remove.isPending;

  return (
    <div className="flex flex-col gap-y-2">
      {isError ? (
        <Text size="small" className="text-ui-fg-error">
          {t("general.loadFailed")}
        </Text>
      ) : assignments.length === 0 ? (
        <NoRecords
          size="small"
          title={t("conversations.customer.panel.tags.empty")}
          message={t("conversations.customer.panel.tags.emptyHint")}
          icon={<IconTag />}
        />
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {assignments.map((assignment) => (
            <TagChip
              key={assignment.id}
              assignment={assignment}
              onRemove={() => {
                if (!assignment.tag?.id) return;
                remove.mutate(assignment.tag.id);
              }}
              disabled={isBusy}
            />
          ))}
        </ul>
      )}

      <div>
        <CustomerTagPicker
          tags={catalog}
          appliedTagIds={appliedTagIds}
          onApply={(tagId) => apply.mutate(tagId)}
          onRemove={(tagId) => remove.mutate(tagId)}
          disabled={isBusy}
        />
      </div>
    </div>
  );
}

function TagLabel({ tag }: { tag: CustomerTagGetResponseDto }) {
  return (
    <span className="flex items-center gap-x-1.5">
      {tag.emoji ? <span aria-hidden>{tag.emoji}</span> : null}
      <span>{tag.name}</span>
    </span>
  );
}

function TagChip({
  assignment,
  onRemove,
  disabled,
}: {
  assignment: CustomerTagAssignmentGetResponseDto;
  onRemove: () => void;
  disabled: boolean;
}) {
  const { t } = useTranslation();
  const tag = assignment.tag;

  if (!tag) return null;

  return (
    <li>
      <Badge size="small" className="flex items-center gap-x-1">
        <TagLabel tag={tag} />
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          aria-label={t("conversations.customer.panel.tags.remove")}
          className="text-ui-fg-subtle hover:text-ui-fg-base disabled:opacity-50"
        >
          <XMarkMini />
        </button>
      </Badge>
    </li>
  );
}

function CustomerActions({
  customerId,
  customerName,
  onErased,
}: {
  customerId: string;
  customerName?: string | null;
  onErased?: () => void;
}) {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const unmerge = useUnmergeCustomer(customerId);
  const exportData = useExportCustomer(customerId);
  const erase = useEraseCustomer(customerId);

  const handleExport = () =>
    toast.promise(
      exportData
        .mutateAsync()
        .then((data) => downloadJson(data, `customer-${customerId}.json`)),
      {
        loading: t("conversations.customer.panel.exportData.loading"),
        success: t("conversations.customer.panel.exportData.success"),
        error: t("conversations.customer.panel.exportData.error"),
      },
    );

  const handleErase = async () => {
    const confirmed = await prompt({
      title: t("conversations.customer.panel.erase.confirm.title"),
      description: t("conversations.customer.panel.erase.confirm.body"),
      confirmText: t("conversations.customer.panel.erase.confirm.confirm"),
      cancelText: t("conversations.customer.panel.erase.confirm.cancel"),
      variant: "danger",
      // Typing the name (or a fixed word when there is none) makes a
      // permanent delete a deliberate act, not a slip of the mouse.
      verificationText:
        customerName?.trim() ||
        t("conversations.customer.panel.erase.confirm.verification"),
    });

    if (!confirmed) return;

    try {
      await erase.mutateAsync();
      toast.success(t("conversations.customer.panel.erase.toast.success"));
      onErased?.();
    } catch {
      toast.error(t("conversations.customer.panel.erase.toast.failed"));
    }
  };

  const handleUnmerge = async () => {
    const confirmed = await prompt({
      title: t("conversations.customer.panel.unmerge.confirm.title"),
      description: t("conversations.customer.panel.unmerge.confirm.body"),
      confirmText: t("conversations.customer.panel.unmerge.confirm.confirm"),
      cancelText: t("conversations.customer.panel.unmerge.confirm.cancel"),
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      await unmerge.mutateAsync();
      toast.success(t("conversations.customer.panel.unmerge.toast.success"));
    } catch (e) {
      toast.error(t("conversations.customer.panel.unmerge.toast.failed"));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        <IconButton
          size="small"
          variant="transparent"
          aria-label={t("conversations.customer.panel.actions.more")}
        >
          <EllipsisHorizontal />
        </IconButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <DropdownMenu.Item onClick={handleUnmerge} disabled={unmerge.isPending}>
          {t("conversations.customer.panel.unmerge.action")}
        </DropdownMenu.Item>
        <Can I="read" a={CUSTOMER_DATA_SUBJECT}>
          <DropdownMenu.Item
            onClick={handleExport}
            disabled={exportData.isPending}
          >
            {t("conversations.customer.panel.exportData.action")}
          </DropdownMenu.Item>
        </Can>
        <Can I="delete" a={CUSTOMER_DATA_SUBJECT}>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            onClick={handleErase}
            disabled={erase.isPending}
            className="text-ui-fg-error"
          >
            {t("conversations.customer.panel.erase.action")}
          </DropdownMenu.Item>
        </Can>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

function ContactPointsList({
  contactPoints,
}: {
  contactPoints: ContactPointGetResponseDto[];
}) {
  const { t } = useTranslation();

  if (contactPoints.length === 0) {
    return (
      <NoRecords
        size="small"
        title={t("conversations.customer.panel.contactPoints.empty")}
        message={t("conversations.customer.panel.contactPoints.emptyHint")}
        icon={<IconAddressBook />}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-y-2">
      {contactPoints.map((cp) => (
        <li
          key={cp.id}
          className="border-ui-border-base bg-ui-bg-base flex items-center gap-x-2 rounded border px-2 py-1.5"
        >
          <PlatformIcon
            type={cp.platform as A}
            size={16}
            className="shrink-0"
          />
          <div className="flex min-w-0 flex-col">
            <Text size="small" weight="plus" className="truncate">
              {cp.displaySenderName ?? cp.externalSenderId}
            </Text>
            {cp.displaySenderName && (
              <Text size="xsmall" className="text-ui-fg-subtle truncate">
                {cp.externalSenderId}
              </Text>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

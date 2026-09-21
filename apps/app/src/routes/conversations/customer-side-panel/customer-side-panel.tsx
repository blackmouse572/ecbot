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
  useUpdateCustomer,
  type CustomerUpdateRequestDto,
} from "@/hooks/api/customers";
import { useUnmergeCustomer } from "@/hooks/api/customer-merge-suggestions";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { FollowupsSection } from "./components/followups-section";
import {
  ChevronDoubleLeft,
  ChevronDoubleRight,
  EllipsisHorizontal,
  XMarkMini,
} from "@medusajs/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  DropdownMenu,
  Heading,
  IconButton,
  Input,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { Form, Skeleton } from "@repo/ui/common-components";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import zod from "zod";

const CustomerFormSchema = zod.object({
  name: zod.string().max(255).optional().nullable(),
  phone: zod.string().max(50).optional().nullable(),
  email: zod
    .string()
    .max(255)
    .optional()
    .nullable()
    .refine((v) => !v || /^\S+@\S+\.\S+$/.test(v), "invalid email"),
  language: zod.string().max(10).optional().nullable(),
  notes: zod.string().max(5000).optional().nullable(),
});

type CustomerFormData = zod.infer<typeof CustomerFormSchema>;

interface Props {
  customerId: string | undefined | null;
  conversationId?: string;
  isOpen?: boolean;
  onToggle?: () => void;
  onViewMessage?: (messageId: string) => void;
}

export function CustomerSidePanel({
  customerId,
  conversationId,
  isOpen = true,
  onToggle,
  onViewMessage,
}: Props) {
  const { t } = useTranslation();
  const { customer, isLoading } = useCustomer(customerId);
  const { contactPoints } = useContactPointsByCustomer(customerId);
  const { mutateAsync, isPending } = useUpdateCustomer(customerId);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(CustomerFormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      language: "",
      notes: "",
    },
  });

  // Clear the form the instant the selected customer changes, so the previous
  // customer's values — and any unsaved edits — never linger in the fields or
  // get saved onto the newly-selected customer while it loads.
  useEffect(() => {
    form.reset({ name: "", phone: "", email: "", language: "", notes: "" });
  }, [customerId, form]);

  // Populate once the customer arrives. Skip while the user is mid-edit so a
  // background refetch of the same customer doesn't clobber their changes.
  useEffect(() => {
    if (!customer || form.formState.isDirty) return;
    form.reset({
      name: customer.name ?? "",
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      language: customer.language ?? "",
      notes: customer.notes ?? "",
    });
  }, [customer, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!customerId) return;
    const patch: CustomerUpdateRequestDto = {
      name: data.name?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      language: data.language?.trim() || null,
      notes: data.notes?.trim() || null,
    };
    toast.promise(mutateAsync(patch), {
      loading: t("conversations.customer.panel.toast.saving"),
      success: t("conversations.customer.panel.toast.updated"),
      error: t("conversations.customer.panel.toast.updateFailed"),
    });
  });

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
        <Heading level="h3">{t("conversations.customer.panel.title")}</Heading>
        <div className="flex items-center gap-x-1">
          <IconButton
            size="small"
            variant="transparent"
            onClick={onToggle}
            aria-label={t("conversations.customer.panel.collapse")}
          >
            <ChevronDoubleRight />
          </IconButton>
          <CustomerActions customerId={customerId} />
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
          <Form {...form}>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-y-4 px-4 py-4"
            >
              <Form.Field
                control={form.control}
                name="name"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("conversations.customer.panel.fields.name")}
                    </Form.Label>
                    <Form.Control>
                      <Input {...field} value={field.value ?? ""} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("conversations.customer.panel.fields.phone")}
                    </Form.Label>
                    <Form.Control>
                      <Input {...field} value={field.value ?? ""} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="email"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("conversations.customer.panel.fields.email")}
                    </Form.Label>
                    <Form.Control>
                      <Input {...field} value={field.value ?? ""} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="language"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("conversations.customer.panel.fields.language")}
                    </Form.Label>
                    <Form.Control>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="en, vi"
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("conversations.customer.panel.fields.notes")}
                    </Form.Label>
                    <Form.Control>
                      <Textarea {...field} value={field.value ?? ""} rows={4} />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <div className="flex gap-x-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="small"
                  isLoading={isPending}
                  disabled={isPending || !form.formState.isDirty}
                >
                  {t("actions.save")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  disabled={isPending || !form.formState.isDirty}
                  onClick={() => form.reset()}
                >
                  {t("actions.cancel")}
                </Button>
              </div>
            </form>
          </Form>

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

          {conversationId && (
            <div className="border-ui-border-base border-t px-4 py-4">
              <Heading level="h3" className="mb-2">
                {t("conversations.customer.panel.followups.title")}
              </Heading>
              <FollowupsSection
                conversationId={conversationId}
                onViewMessage={onViewMessage}
              />
            </div>
          )}
        </>
      )}
    </aside>
  );
}

function TagsSection({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const { assignments } = useCustomerTagAssignments(customerId);
  const { tags: catalog } = useCustomerTagList();
  const apply = useApplyCustomerTag(customerId);
  const remove = useRemoveCustomerTag(customerId);

  const appliedTagIds = useMemo(
    () =>
      new Set(assignments.map((a) => a.tag?.id).filter(Boolean) as string[]),
    [assignments],
  );

  const available = useMemo(
    () => catalog.filter((tag) => !appliedTagIds.has(tag.id)),
    [catalog, appliedTagIds],
  );

  const isBusy = apply.isPending || remove.isPending;

  return (
    <div className="flex flex-col gap-y-2">
      {assignments.length === 0 ? (
        <Text size="small" className="text-ui-fg-subtle">
          {t("conversations.customer.panel.tags.empty")}
        </Text>
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
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="small"
              disabled={isBusy || available.length === 0}
            >
              {t("conversations.customer.panel.tags.add")}
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {available.map((tag) => (
              <DropdownMenu.Item
                key={tag.id}
                onClick={() => apply.mutate(tag.id)}
              >
                <TagLabel tag={tag} />
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Content>
        </DropdownMenu>
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

function CustomerActions({ customerId }: { customerId: string }) {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const unmerge = useUnmergeCustomer(customerId);

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
      <Text size="small" className="text-ui-fg-subtle">
        {t("conversations.customer.panel.contactPoints.empty")}
      </Text>
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

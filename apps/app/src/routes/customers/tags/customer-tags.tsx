import { _DataTable } from "@/components/table/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import {
  useCreateCustomerTag,
  useCustomerTagList,
  useDeleteCustomerTag,
  useUpdateCustomerTag,
  type CustomerTagCreateRequestDto,
  type CustomerTagGetResponseDto,
} from "@/hooks/api/customer-tags";
import { Pencil, Trash } from "@medusajs/icons";
import {
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  StatusBadge,
  Switch,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ActionMenu,
  EmojiPickerButton,
  Form,
} from "@repo/ui/common-components";
import { createColumnHelper } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import zod from "zod";

const TagFormSchema = zod.object({
  name: zod.string().min(1).max(64),
  emoji: zod.string().max(16).optional().nullable(),
  description: zod.string().max(2000).optional().nullable(),
  triggersHandoff: zod.boolean(),
});

type TagFormValues = zod.infer<typeof TagFormSchema>;

type DrawerTarget = CustomerTagGetResponseDto | null | "new";

export const CustomerTags = () => {
  const { t } = useTranslation();
  const { tags, isLoading } = useCustomerTagList();
  const [editing, setEditing] = useState<DrawerTarget>(null);

  const columns = useColumns({ onEdit: (tag) => setEditing(tag) });

  // Catalog is small (seeded with 8, rarely > 50). We still use the table
  // pagination state (the DataTable shell reads it unconditionally) but pick
  // a large page size so every row renders on one page.
  const PAGE_SIZE = 100;
  const { table } = useDataTable({
    data: tags,
    columns,
    count: tags.length,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>{t("settings.customerTags.title")}</Heading>
            <Text className="text-ui-fg-subtle">
              {t("settings.customerTags.description")}
            </Text>
          </div>
          <Button
            type="button"
            variant="primary"
            size="small"
            onClick={() => setEditing("new")}
          >
            {t("settings.customerTags.actions.create")}
          </Button>
        </div>
        <_DataTable
          table={table}
          columns={columns}
          count={tags.length}
          pageSize={PAGE_SIZE}
          isLoading={isLoading}
          noRecords={{
            message: t("settings.customerTags.toast.deleted"),
          }}
        />
      </Container>

      <CustomerTagDrawer target={editing} onClose={() => setEditing(null)} />
    </div>
  );
};

const CustomerTagRowActions = ({
  tag,
  onEdit,
}: {
  tag: CustomerTagGetResponseDto;
  onEdit: (tag: CustomerTagGetResponseDto) => void;
}) => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const deleteMutation = useDeleteCustomerTag();

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("settings.customerTags.delete.confirm.title"),
      description: t("settings.customerTags.delete.confirm.body"),
      confirmText: t("settings.customerTags.delete.confirm.confirm"),
      cancelText: t("settings.customerTags.delete.confirm.cancel"),
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(tag.id);
      toast.success(t("settings.customerTags.toast.deleted"));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <ActionMenu
      groups={[
        {
          actions: [
            {
              icon: <Pencil />,
              label: t("actions.edit"),
              onClick: () => onEdit(tag),
            },
          ],
        },
        {
          actions: [
            {
              icon: <Trash />,
              label: t("actions.delete"),
              onClick: handleDelete,
            },
          ],
        },
      ]}
    />
  );
};

const columnHelper = createColumnHelper<CustomerTagGetResponseDto>();
const useColumns = ({
  onEdit,
}: {
  onEdit: (tag: CustomerTagGetResponseDto) => void;
}) => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.display({
        id: "name",
        header: () => t("settings.customerTags.fields.name"),
        cell: ({ row }) => (
          <span>
            {row.original.emoji && <span>{row.original.emoji} </span>}
            {row.original.name}
          </span>
        ),
      }),
      columnHelper.display({
        id: "description",
        header: () => t("settings.customerTags.fields.description"),
        cell: ({ row }) => (
          <span className="text-ui-fg-subtle line-clamp-1">
            {row.original.description ?? ""}
          </span>
        ),
      }),
      columnHelper.display({
        id: "triggersHandoff",
        header: () => t("settings.customerTags.fields.triggersHandoff"),
        cell: ({ row }) => (
          <StatusBadge color={row.original.triggersHandoff ? "green" : "grey"}>
            {row.original.triggersHandoff
              ? t("accounts.details.statuses.active.label")
              : t("accounts.details.statuses.inactive.label")}
          </StatusBadge>
        ),
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => (
          <CustomerTagRowActions tag={row.original} onEdit={onEdit} />
        ),
      }),
    ],
    [onEdit, t],
  );
};

function CustomerTagDrawer({
  target,
  onClose,
}: {
  target: DrawerTarget;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const isOpen = target !== null;
  const isNew = target === "new";
  const tag = !isNew && target ? target : null;
  const createMutation = useCreateCustomerTag();
  const updateMutation = useUpdateCustomerTag(tag?.id ?? null);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(TagFormSchema),
    defaultValues: {
      name: "",
      emoji: "",
      description: "",
      triggersHandoff: false,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (tag) {
      form.reset({
        name: tag.name,
        emoji: tag.emoji ?? "",
        description: tag.description ?? "",
        triggersHandoff: tag.triggersHandoff,
      });
    } else {
      form.reset({
        name: "",
        emoji: "",
        description: "",
        triggersHandoff: false,
      });
    }
  }, [isOpen, tag, form]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = form.handleSubmit(async (values) => {
    const payload: CustomerTagCreateRequestDto = {
      name: values.name.trim(),
      emoji: values.emoji?.trim() || null,
      description: values.description?.trim() || null,
      triggersHandoff: values.triggersHandoff,
    };
    try {
      if (tag) {
        await updateMutation.mutateAsync(payload);
        toast.success(t("settings.customerTags.toast.updated"));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t("settings.customerTags.toast.created"));
      }
      onClose();
    } catch (e) {
      console.error(e);
      // 409 = tag name already taken in this workspace.
      if (
        e &&
        typeof e === "object" &&
        "status" in e &&
        (e as { status?: number }).status === 409
      ) {
        form.setError("name", {
          type: "manual",
          message: t("settings.customerTags.errors.nameTaken"),
        });
        return;
      }
      toast.error(
        t(
          tag
            ? "settings.customerTags.toast.updateFailed"
            : "settings.customerTags.toast.createFailed",
        ),
      );
    }
  });

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {tag
              ? t("settings.customerTags.actions.edit")
              : t("settings.customerTags.actions.create")}
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          <Form {...form}>
            <form
              id="customer-tag-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-y-4"
            >
              <Form.Field
                control={form.control}
                name="name"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("settings.customerTags.fields.name")}
                    </Form.Label>
                    <div className="flex items-center gap-x-2 [&_div]:flex-1">
                      <Form.Field
                        control={form.control}
                        name="emoji"
                        render={({ field: emojiField }) => (
                          <EmojiPickerButton
                            aria-label={t("settings.customerTags.fields.emoji")}
                            value={emojiField.value}
                            onChange={emojiField.onChange}
                          />
                        )}
                      />
                      <Form.Control className="size-full">
                        <Input
                          {...field}
                          placeholder={t(
                            "settings.customerTags.fields.namePlaceholder",
                          )}
                        />
                      </Form.Control>
                    </div>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="description"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("settings.customerTags.fields.description")}
                    </Form.Label>
                    <Form.Control>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        rows={3}
                        placeholder={t(
                          "settings.customerTags.fields.descriptionPlaceholder",
                        )}
                      />
                    </Form.Control>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
              <Form.Field
                control={form.control}
                name="triggersHandoff"
                render={({ field }) => (
                  <Form.Item>
                    <div className="flex items-start justify-between gap-x-4">
                      <div className="flex flex-col">
                        <Form.Label>
                          {t("settings.customerTags.fields.triggersHandoff")}
                        </Form.Label>
                        <Text size="small" className="text-ui-fg-subtle">
                          {t(
                            "settings.customerTags.fields.triggersHandoffHelp",
                          )}
                        </Text>
                      </div>
                      <Form.Control>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </Form.Control>
                    </div>
                    <Form.ErrorMessage />
                  </Form.Item>
                )}
              />
            </form>
          </Form>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <Drawer.Close asChild>
              <Button type="button" variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </Drawer.Close>
            <Button
              type="submit"
              form="customer-tag-form"
              variant="primary"
              size="small"
              isLoading={isPending}
              disabled={isPending}
            >
              {tag ? t("actions.save") : t("actions.create")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

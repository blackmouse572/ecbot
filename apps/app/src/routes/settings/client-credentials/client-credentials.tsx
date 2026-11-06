import { IconKey } from "@tabler/icons-react";
import { _DataTable } from "@/components/table/data-table";
import { useWorkspace } from "@/hooks/api";
import {
  useClientCredentialList,
  useCreateClientCredential,
  useDeleteClientCredential,
  useRotateClientCredential,
  type ClientCredentialCreateResponseDto,
  type ClientCredentialGetResponseDto,
} from "@/hooks/api/client-credentials";
import { useDataTable } from "@/hooks/use-data-table";
import { readApiError } from "@/libs/api-error";
import { isWorkspaceSuspendedError } from "@/libs/workspace-suspended";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowPath, InformationCircleSolid, Trash } from "@medusajs/icons";
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Text,
  toast,
  Tooltip,
  usePrompt,
} from "@medusajs/ui";
import { useAbility } from "@repo/auth";
import { ActionMenu, Form } from "@repo/ui/common-components";
import { createColumnHelper } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import zod from "zod";

import { ApiKeyQuickStart } from "./components/api-key-quick-start";
import { ApiKeyReveal } from "./components/api-key-reveal";

const ApiKeyFormSchema = zod.object({
  name: zod.string().min(1).max(100),
});

type ApiKeyFormValues = zod.infer<typeof ApiKeyFormSchema>;

const PAGE_SIZE = 100;

/** The same checks the API runs on each route (WorkspaceScopedProtected). */
const useApiKeyAbilities = () => {
  const ability = useAbility();
  return {
    canRead: ability.can("read", "CLIENT_CREDENTIAL"),
    canCreate: ability.can("create", "CLIENT_CREDENTIAL"),
    // POST /:id/rotate is guarded by UPDATE.
    canRotate: ability.can("update", "CLIENT_CREDENTIAL"),
    canDelete: ability.can("delete", "CLIENT_CREDENTIAL"),
  };
};

/** A 403 from the list call, other than a suspended workspace. */
const isForbidden = (error: unknown) =>
  readApiError(error).status === 403 && !isWorkspaceSuspendedError(error);

export const ClientCredentials = () => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const { canRead, canCreate, canRotate, canDelete } = useApiKeyAbilities();
  const { credentials, isLoading, isError, error } = useClientCredentialList({
    enabled: canRead,
  });
  const [creating, setCreating] = useState(false);

  const columns = useColumns({ canRotate, canDelete });

  const { table } = useDataTable({
    data: credentials,
    columns,
    count: credentials.length,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  const canView = canRead && !(isError && isForbidden(error));
  if (isError && canView) throw error;

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 max-w-2xl flex-col gap-y-1">
            <Heading>{t("settings.clientCredentials.title")}</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {t("settings.clientCredentials.subtitle", {
                workspace: workspace?.name ?? "",
              })}
            </Text>
          </div>
          {canView && canCreate && (
            <Button
              type="button"
              variant="primary"
              size="small"
              disabled={isLoading}
              onClick={() => setCreating(true)}
            >
              {t("settings.clientCredentials.actions.create")}
            </Button>
          )}
          {canView && !canCreate && (
            <Text
              size="small"
              className="text-ui-fg-subtle max-w-xs"
              data-testid="api-keys-no-permission"
            >
              {t("settings.clientCredentials.noPermission")}
            </Text>
          )}
        </div>
        {canView ? (
          <>
            <ApiKeyQuickStart />
            <_DataTable
              table={table}
              columns={columns}
              count={credentials.length}
              pageSize={PAGE_SIZE}
              isLoading={isLoading}
              noRecords={{
                title: t("settings.clientCredentials.emptyTitle"),
                message: t("settings.clientCredentials.empty"),
                action: canCreate
                  ? {
                      onClick: () => setCreating(true),
                      label: t("settings.clientCredentials.actions.create"),
                    }
                  : undefined,
                icon: <IconKey />,
              }}
            />
          </>
        ) : (
          <div
            className="flex flex-col items-center gap-y-2 px-6 py-12 text-center"
            data-testid="api-keys-no-access"
          >
            <IconKey className="text-ui-fg-muted" />
            <Text size="small" className="text-ui-fg-subtle max-w-sm">
              {t("settings.clientCredentials.noReadPermission")}
            </Text>
          </div>
        )}
      </Container>

      {canCreate && (
        <CreateApiKeyDrawer
          open={creating}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
};

const columnHelper = createColumnHelper<ClientCredentialGetResponseDto>();
const useColumns = ({
  canRotate,
  canDelete,
}: {
  canRotate: boolean;
  canDelete: boolean;
}) => {
  const { t, i18n } = useTranslation();

  return useMemo(
    () => [
      columnHelper.accessor("name", {
        header: () => t("settings.clientCredentials.fields.name"),
        cell: ({ getValue }) => <span>{getValue()}</span>,
      }),
      columnHelper.accessor("key", {
        // Only the public half of the key: it can't authenticate on its own.
        header: () => (
          <span className="inline-flex items-center gap-x-1">
            {t("settings.clientCredentials.fields.key")}
            <Tooltip content={t("settings.clientCredentials.keyIdHint")}>
              <InformationCircleSolid
                className="text-ui-fg-muted"
                aria-label={t("settings.clientCredentials.keyIdHint")}
              />
            </Tooltip>
          </span>
        ),
        cell: ({ getValue }) => (
          <span className="text-ui-fg-muted font-mono">{getValue()}</span>
        ),
      }),
      columnHelper.display({
        id: "createdBy",
        header: () => t("settings.clientCredentials.fields.createdBy"),
        cell: ({ row }) => (
          <span className="text-ui-fg-subtle">
            {row.original.createdBy?.name || row.original.createdBy?.email}
          </span>
        ),
      }),
      columnHelper.display({
        id: "status",
        header: () => t("settings.clientCredentials.fields.status"),
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge size="small" color="green">
              {t("settings.clientCredentials.status.active")}
            </Badge>
          ) : (
            <Badge size="small" color="grey">
              {t("settings.clientCredentials.status.inactive")}
            </Badge>
          ),
      }),
      columnHelper.accessor("createdAt", {
        header: () => t("settings.clientCredentials.fields.createdAt"),
        cell: ({ getValue }) => (
          <span className="text-ui-fg-subtle">
            {new Date(getValue()).toLocaleDateString(i18n.language)}
          </span>
        ),
      }),
      // No column at all when the member may neither rotate nor delete.
      ...(canRotate || canDelete
        ? [
            columnHelper.display({
              id: "actions",
              cell: ({ row }) => (
                <ApiKeyRowActions
                  apiKey={row.original}
                  canRotate={canRotate}
                  canDelete={canDelete}
                />
              ),
            }),
          ]
        : []),
    ],
    [t, i18n.language, canRotate, canDelete],
  );
};

const ApiKeyRowActions = ({
  apiKey,
  canRotate,
  canDelete,
}: {
  apiKey: ClientCredentialGetResponseDto;
  canRotate: boolean;
  canDelete: boolean;
}) => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const deleteMutation = useDeleteClientCredential();
  const rotateMutation = useRotateClientCredential();
  // Held only until the drawer closes: like creation, the secret is never
  // recoverable, so there is nowhere else it could come from.
  const [rotated, setRotated] =
    useState<ClientCredentialCreateResponseDto | null>(null);

  const handleRotate = async () => {
    const confirmed = await prompt({
      title: t("settings.clientCredentials.rotate.confirm.title"),
      description: t("settings.clientCredentials.rotate.confirm.body"),
      confirmText: t("settings.clientCredentials.rotate.confirm.confirm"),
      cancelText: t("settings.clientCredentials.delete.confirm.cancel"),
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      setRotated(await rotateMutation.mutateAsync(apiKey.id));
    } catch (e) {
      console.error(e);
      toast.error(t("settings.clientCredentials.toast.rotateFailed"));
    }
  };

  const handleDelete = async () => {
    const confirmed = await prompt({
      title: t("settings.clientCredentials.delete.confirm.title"),
      description: t("settings.clientCredentials.delete.confirm.body"),
      confirmText: t("settings.clientCredentials.delete.confirm.confirm"),
      cancelText: t("settings.clientCredentials.delete.confirm.cancel"),
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(apiKey.id);
      toast.success(t("settings.clientCredentials.toast.deleted"));
    } catch (e) {
      console.error(e);
      toast.error(t("settings.clientCredentials.toast.deleteFailed"));
    }
  };

  return (
    <>
      <ActionMenu
        groups={[
          {
            actions: [
              ...(canRotate
                ? [
                    {
                      icon: <ArrowPath />,
                      label: t("settings.clientCredentials.rotate.action"),
                      onClick: handleRotate,
                    },
                  ]
                : []),
              ...(canDelete
                ? [
                    {
                      icon: <Trash />,
                      label: t("actions.delete"),
                      onClick: handleDelete,
                    },
                  ]
                : []),
            ],
          },
        ]}
      />
      <RevealDrawer
        title={t("settings.clientCredentials.rotate.title")}
        credential={rotated}
        onClose={() => setRotated(null)}
      />
    </>
  );
};

/**
 * Shows a freshly issued key. It ignores outside clicks and Escape, and its
 * Done button stays disabled, until the key is copied or marked as saved.
 */
export function RevealDrawer({
  title,
  credential,
  onClose,
}: {
  title: string;
  credential: ClientCredentialCreateResponseDto | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(false);
  }, [credential]);

  const close = () => saved && onClose();

  return (
    <Drawer open={!!credential} onOpenChange={(next) => !next && close()}>
      <Drawer.Content
        onInteractOutside={(e) => !saved && e.preventDefault()}
        onEscapeKeyDown={(e) => !saved && e.preventDefault()}
      >
        <Drawer.Header>
          <Drawer.Title>{title}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          {credential && (
            <ApiKeyReveal
              credential={credential}
              saved={saved}
              onSavedChange={setSaved}
            />
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-x-3">
            {!saved && (
              <Text size="small" className="text-ui-fg-subtle">
                {t("settings.clientCredentials.reveal.savedRequired")}
              </Text>
            )}
            <Button
              type="button"
              variant="primary"
              size="small"
              disabled={!saved}
              onClick={close}
            >
              {t("settings.clientCredentials.reveal.done")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

function CreateApiKeyDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const createMutation = useCreateClientCredential();
  const [created, setCreated] =
    useState<ClientCredentialCreateResponseDto | null>(null);

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(ApiKeyFormSchema),
    defaultValues: { name: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset({ name: "" });
      setCreated(null);
    }
  }, [open, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      const result = await createMutation.mutateAsync({
        name: values.name.trim(),
      });
      setCreated(result);
      toast.success(t("settings.clientCredentials.toast.created"));
    } catch (e) {
      console.error(e);
      toast.error(t("settings.clientCredentials.toast.createFailed"));
    }
  });

  // Once the key exists, the reveal drawer takes over until it is saved.
  if (created) {
    return (
      <RevealDrawer
        title={t("settings.clientCredentials.reveal.title")}
        credential={created}
        onClose={() => {
          setCreated(null);
          onClose();
        }}
      />
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {t("settings.clientCredentials.actions.create")}
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          <Form {...form}>
            <form
              id="api-key-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-y-4"
            >
              <Form.Field
                control={form.control}
                name="name"
                render={({ field }) => (
                  <Form.Item>
                    <Form.Label>
                      {t("settings.clientCredentials.fields.name")}
                    </Form.Label>
                    <Form.Control>
                      <Input
                        {...field}
                        autoComplete="off"
                        placeholder={t(
                          "settings.clientCredentials.namePlaceholder",
                        )}
                      />
                    </Form.Control>
                    <Form.Hint>
                      {t("settings.clientCredentials.nameHelp")}
                    </Form.Hint>
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
              form="api-key-form"
              variant="primary"
              size="small"
              isLoading={createMutation.isPending}
              disabled={createMutation.isPending}
            >
              {t("actions.create")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

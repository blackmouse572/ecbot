import { _DataTable } from "@/components/table/data-table";
import {
  useClientCredentialList,
  useCreateClientCredential,
  useDeleteClientCredential,
  useRotateClientCredential,
  type ClientCredentialCreateResponseDto,
  type ClientCredentialGetResponseDto,
} from "@/hooks/api/client-credentials";
import { useDataTable } from "@/hooks/use-data-table";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowPath,
  CheckCircleSolid,
  SquareTwoStack,
  Trash,
} from "@medusajs/icons";
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  IconButton,
  Input,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { ActionMenu, Form } from "@repo/ui/common-components";
import { createColumnHelper } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import zod from "zod";

const CredentialFormSchema = zod.object({
  name: zod.string().min(1).max(100),
});

type CredentialFormValues = zod.infer<typeof CredentialFormSchema>;

const PAGE_SIZE = 100;

export const ClientCredentials = () => {
  const { t } = useTranslation();
  const { credentials, isLoading } = useClientCredentialList();
  const [creating, setCreating] = useState(false);

  const columns = useColumns();

  const { table } = useDataTable({
    data: credentials,
    columns,
    count: credentials.length,
    pageSize: PAGE_SIZE,
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading>{t("settings.clientCredentials.title")}</Heading>
          </div>
          <Button
            type="button"
            variant="primary"
            size="small"
            disabled={isLoading}
            onClick={() => setCreating(true)}
          >
            {t("actions.create")}
          </Button>
        </div>
        <_DataTable
          table={table}
          columns={columns}
          count={credentials.length}
          pageSize={PAGE_SIZE}
          isLoading={isLoading}
          noRecords={{
            message: t("settings.clientCredentials.empty"),
          }}
        />
      </Container>

      <CreateCredentialDrawer
        open={creating}
        onClose={() => setCreating(false)}
      />
    </div>
  );
};

const columnHelper = createColumnHelper<ClientCredentialGetResponseDto>();
const useColumns = () => {
  const { t } = useTranslation();

  return useMemo(
    () => [
      columnHelper.accessor("name", {
        header: () => t("settings.clientCredentials.fields.name"),
        cell: ({ getValue }) => <span>{getValue()}</span>,
      }),
      columnHelper.accessor("key", {
        header: () => t("settings.clientCredentials.fields.key"),
        cell: ({ getValue }) => (
          <span className="font-mono text-ui-fg-subtle">{getValue()}</span>
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
            {new Date(getValue()).toLocaleDateString()}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        cell: ({ row }) => <CredentialRowActions credential={row.original} />,
      }),
    ],
    [t],
  );
};

const CredentialRowActions = ({
  credential,
}: {
  credential: ClientCredentialGetResponseDto;
}) => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const deleteMutation = useDeleteClientCredential();
  const rotateMutation = useRotateClientCredential();
  // Held only until the drawer closes — like creation, the secret is never
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
      setRotated(await rotateMutation.mutateAsync(credential.id));
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
      await deleteMutation.mutateAsync(credential.id);
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
              {
                icon: <ArrowPath />,
                label: t("settings.clientCredentials.rotate.action"),
                onClick: handleRotate,
              },
              {
                icon: <Trash />,
                label: t("actions.delete"),
                onClick: handleDelete,
              },
            ],
          },
        ]}
      />
      <Drawer open={!!rotated} onOpenChange={() => setRotated(null)}>
        <Drawer.Content>
          <Drawer.Header>
            <Heading>{t("settings.clientCredentials.rotate.title")}</Heading>
          </Drawer.Header>
          <Drawer.Body>
            {rotated && <RevealCredential credential={rotated} />}
          </Drawer.Body>
          <Drawer.Footer>
            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={() => setRotated(null)}
            >
              {t("actions.close")}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </>
  );
};

function CreateCredentialDrawer({
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

  const form = useForm<CredentialFormValues>({
    resolver: zodResolver(CredentialFormSchema),
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

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {created
              ? t("settings.clientCredentials.reveal.title")
              : t("settings.clientCredentials.actions.create")}
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          {created ? (
            <RevealCredential credential={created} />
          ) : (
            <Form {...form}>
              <form
                id="client-credential-form"
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
                        <Input {...field} autoComplete="off" />
                      </Form.Control>
                      <Form.ErrorMessage />
                    </Form.Item>
                  )}
                />
              </form>
            </Form>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            {created ? (
              <Button
                type="button"
                variant="primary"
                size="small"
                onClick={onClose}
              >
                {t("actions.close")}
              </Button>
            ) : (
              <>
                <Drawer.Close asChild>
                  <Button type="button" variant="secondary" size="small">
                    {t("actions.cancel")}
                  </Button>
                </Drawer.Close>
                <Button
                  type="submit"
                  form="client-credential-form"
                  variant="primary"
                  size="small"
                  isLoading={createMutation.isPending}
                  disabled={createMutation.isPending}
                >
                  {t("actions.create")}
                </Button>
              </>
            )}
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

function RevealCredential({
  credential,
}: {
  credential: ClientCredentialCreateResponseDto;
}) {
  const { t } = useTranslation();
  // The value a 3rd-party sends as the x-api-key header.
  const token = `${credential.key}:${credential.secret}`;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      toast.success(t("settings.clientCredentials.reveal.copied"));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col gap-y-4">
      <Badge size="small" color="orange">
        {t("settings.clientCredentials.reveal.warning")}
      </Badge>
      <div className="flex flex-col gap-y-1">
        <Text size="small" weight="plus">
          {t("settings.clientCredentials.reveal.tokenLabel")}
        </Text>
        <div className="bg-ui-bg-subtle flex items-center gap-x-2 rounded-md border p-2">
          <code className="flex-1 break-all font-mono text-xs">{token}</code>
          <IconButton
            type="button"
            size="small"
            variant="transparent"
            onClick={handleCopy}
            aria-label={t("settings.clientCredentials.reveal.copy")}
          >
            {copied ? <CheckCircleSolid /> : <SquareTwoStack />}
          </IconButton>
        </div>
      </div>
    </div>
  );
}

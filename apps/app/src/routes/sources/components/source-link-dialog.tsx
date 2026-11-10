import {
  useCreateTrackedLinkChild,
  useTrackedLink,
  type TrackedLinkGetResponseDto,
} from "@/hooks/api/tracked-links";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { XMark } from "@medusajs/icons";
import { Button, Heading, IconButton, Input, Text, toast } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { Dialog } from "radix-ui";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { sourceLinkSchema, type SourceLinkFormData } from "../schemas";
import { childCodeFromName, withCode } from "../utils";
import { SourceChildRow } from "./source-child-row";
import { SourceLinkField } from "./source-link-field";

export type SourceChildKind = "QR" | "KOL";

type SourceLinkDialogProps = {
  source: TrackedLinkGetResponseDto;
  /** The kind being added; null keeps the dialog closed. */
  kind: SourceChildKind | null;
  onClose: () => void;
};

/** Adds QR codes (one per place) or KOL links under a source, and lists the ones made. */
export const SourceLinkDialog: FC<SourceLinkDialogProps> = ({
  source,
  kind,
  onClose,
}) => (
  <Dialog.Root open={!!kind} onOpenChange={(open) => !open && onClose()}>
    <Dialog.Portal>
      <Dialog.Overlay className="bg-ui-bg-overlay fixed inset-0 z-50" />
      <Dialog.Content className="bg-ui-bg-base shadow-elevation-modal fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[520px] -translate-1/2 flex-col overflow-hidden rounded-lg outline-none">
        {kind && <SourceLinkForm source={source} kind={kind} />}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

const SourceLinkForm: FC<{
  source: TrackedLinkGetResponseDto;
  kind: SourceChildKind;
}> = ({ source, kind }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { link: detail } = useTrackedLink(workspaceSlug, source.id);

  const { mutateAsync, isPending } = useCreateTrackedLinkChild(
    workspaceSlug,
    source.id,
  );

  const form = useForm<SourceLinkFormData>({
    resolver: zodResolver(sourceLinkSchema),
    defaultValues: { name: "" },
  });

  const isKol = kind === "KOL";
  const name = form.watch("name");
  const made = (detail?.children ?? []).filter((child) => child.kind === kind);

  const preview =
    source.url && name.trim()
      ? withCode(source.url, source.code, childCodeFromName(source.code, name))
      : null;

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await mutateAsync({ name: data.name, kind });
      toast.success(t("customerSources.child.created"));
      form.reset({ name: "" });
    } catch (error) {
      toast.error(readApiError(error).message ?? t("customerSources.error"));
    }
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
        <div className="flex items-start justify-between gap-x-4 px-6 pt-5">
          <div className="flex flex-col gap-y-1">
            <Dialog.Title asChild>
              <Heading level="h2">
                {t(
                  isKol
                    ? "customerSources.share.kolTitle"
                    : "customerSources.share.qrTitle",
                )}
              </Heading>
            </Dialog.Title>
            <Dialog.Description asChild>
              <Text size="small" className="text-ui-fg-subtle">
                {t(
                  isKol
                    ? "customerSources.child.kolDescription"
                    : "customerSources.child.qrDescription",
                )}
              </Text>
            </Dialog.Description>
          </div>
          <Dialog.Close asChild>
            <IconButton
              size="small"
              variant="transparent"
              type="button"
              aria-label={t("actions.close")}
            >
              <XMark />
            </IconButton>
          </Dialog.Close>
        </div>

        <div className="flex min-h-0 flex-col gap-y-5 overflow-y-auto px-6 py-5">
          <Form.Field
            control={form.control}
            name="name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>
                  {t(
                    isKol
                      ? "customerSources.child.kolName"
                      : "customerSources.child.qrName",
                  )}
                </Form.Label>
                <Form.Control>
                  <Input
                    {...field}
                    autoFocus
                    placeholder={t(
                      isKol
                        ? "customerSources.child.kolPlaceholder"
                        : "customerSources.child.qrPlaceholder",
                    )}
                  />
                </Form.Control>
                <Form.Hint>{t("customerSources.child.nameHint")}</Form.Hint>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />

          {preview && (
            <div className="flex flex-col gap-y-2">
              <Text size="small" weight="plus">
                {t(
                  isKol
                    ? "customerSources.child.kolLink"
                    : "customerSources.child.qrLink",
                )}
              </Text>
              <SourceLinkField url={preview} copyable={false} />
              <Text size="small" className="text-ui-fg-subtle">
                {t("customerSources.child.sameAs", { name: source.name })}
              </Text>
            </div>
          )}

          {made.length > 0 && (
            <div className="flex flex-col gap-y-2">
              <div className="flex items-center justify-between">
                <Text size="small" weight="plus">
                  {t("customerSources.child.made")}
                </Text>
                <Text size="small" className="text-ui-fg-subtle tabular-nums">
                  {t(`customerSources.child.count.${kind}`, {
                    count: made.length,
                  })}
                </Text>
              </div>
              <div className="divide-y rounded-lg border border-ui-border-base">
                {made.map((child) => (
                  <SourceChildRow key={child.id} link={child} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-x-2 border-t border-ui-border-base px-6 py-4">
          <Dialog.Close asChild>
            <Button size="small" variant="secondary" type="button">
              {t(made.length > 0 ? "actions.close" : "actions.cancel")}
            </Button>
          </Dialog.Close>
          <Button size="small" type="submit" isLoading={isPending}>
            {t("customerSources.child.submit")}
          </Button>
        </div>
      </form>
    </Form>
  );
};

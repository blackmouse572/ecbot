import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useCreateTrackedLinkChild } from "@/hooks/api/tracked-links";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Heading, Input, Text, toast } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Navigate, useParams } from "react-router-dom";
import { sourceLinkSchema, type SourceLinkFormData } from "../schemas";

/** Adds a QR code (one per place) or a KOL link under a source. */
export const SourceLinkCreate = () => {
  const { kind } = useParams<{ kind: string }>();

  if (kind !== "QR" && kind !== "KOL") {
    return <Navigate to=".." replace />;
  }

  return (
    <RouteFocusModal prev="../..">
      <SourceLinkCreateForm kind={kind} />
    </RouteFocusModal>
  );
};

const SourceLinkCreateForm = ({ kind }: { kind: "QR" | "KOL" }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { sourceId = "" } = useParams<{ sourceId: string }>();
  const { handleSuccess } = useRouteModal();

  const { mutateAsync, isPending } = useCreateTrackedLinkChild(
    workspaceSlug,
    sourceId,
  );

  const isKol = kind === "KOL";

  const form = useForm<SourceLinkFormData>({
    resolver: zodResolver(sourceLinkSchema),
    defaultValues: { name: "" },
  });

  const handleSubmit = form.handleSubmit(async ({ name }) => {
    try {
      await mutateAsync({ name, kind });
      toast.success(t("customerSources.child.created"));
      handleSuccess();
    } catch (error) {
      toast.error(readApiError(error).message ?? t("customerSources.error"));
    }
  });

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
          <div className="flex w-full max-w-[720px] flex-col gap-y-6 px-6 py-10">
            <div>
              <RouteFocusModal.Title asChild>
                <Heading>
                  {t(
                    isKol
                      ? "customerSources.share.kolTitle"
                      : "customerSources.share.qrTitle",
                  )}
                </Heading>
              </RouteFocusModal.Title>
              <RouteFocusModal.Description asChild>
                <Text size="small" className="text-ui-fg-subtle">
                  {t(
                    isKol
                      ? "customerSources.child.kolDescription"
                      : "customerSources.child.qrDescription",
                  )}
                </Text>
              </RouteFocusModal.Description>
            </div>
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
                  {isKol && (
                    <Form.Hint>{t("customerSources.child.kolHint")}</Form.Hint>
                  )}
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button size="small" variant="secondary" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("customerSources.child.submit")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
};

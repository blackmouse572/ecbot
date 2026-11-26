import { RouteDrawer, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import {
  useUpdateMarketingSend,
  type MarketingSendGetResponseDto,
} from "@/hooks/api/marketing-sends";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Text, toast } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { SendMessageEditor } from "../marketing-send-create/components/send-message-editor";
import {
  marketingSendEditSchema,
  type MarketingSendEditData,
} from "../schemas";

type SendEditFormProps = { send: MarketingSendGetResponseDto };

export const SendEditForm: FC<SendEditFormProps> = ({ send }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { handleSuccess } = useRouteModal();
  const update = useUpdateMarketingSend(workspaceSlug, send.id);

  const form = useForm<MarketingSendEditData>({
    resolver: zodResolver(marketingSendEditSchema),
    defaultValues: { name: send.name, text: send.text },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await update.mutateAsync(data);
      toast.success(t("marketing.sends.edit.saved"));
      handleSuccess();
    } catch (error) {
      toast.error(readApiError(error).message ?? t("marketing.sends.error"));
    }
  });

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-6 overflow-y-auto">
          <Form.Field
            control={form.control}
            name="name"
            render={({ field }) => (
              <Form.Item>
                <Form.Label>{t("marketing.sends.edit.name")}</Form.Label>
                <Form.Control>
                  <Input {...field} />
                </Form.Control>
                <Form.ErrorMessage />
              </Form.Item>
            )}
          />
          <Form.Field
            control={form.control}
            name="text"
            render={({ field, fieldState }) => (
              <Form.Item>
                <Form.Label>{t("marketing.sends.edit.text")}</Form.Label>
                <SendMessageEditor
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  invalid={!!fieldState.error}
                  placeholder={t("marketing.send.message.placeholder")}
                />
                <Form.ErrorMessage />
                <Text size="small" className="text-ui-fg-subtle">
                  {t("marketing.sends.message.editHint")}
                </Text>
              </Form.Item>
            )}
          />
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary" type="button">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={update.isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
};

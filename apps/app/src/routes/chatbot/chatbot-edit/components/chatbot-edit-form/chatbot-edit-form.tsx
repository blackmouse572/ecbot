import { RouteDrawer, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useUpdateChatbot } from "@/hooks/api/chatbot";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, toast } from "@medusajs/ui";
import type {
  ChatbotGetDetailResponseDto,
  ChatbotUpdateRequestDto,
} from "@repo/client";
import { type ReactNode, useMemo } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  createChatbotSchema,
  type ChatbotFormData,
  type ChatbotFormInput,
} from "../../../schemas";

type ChatbotEditFormProps = {
  chatbot: ChatbotGetDetailResponseDto;
  /** The fields of the card this drawer edits; nothing else is sent. */
  fields: readonly (keyof ChatbotFormData)[];
  children?: ReactNode;
};

export function ChatbotEditForm({
  chatbot,
  fields,
  children,
}: ChatbotEditFormProps) {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const { mutateAsync, isPending } = useUpdateChatbot();

  // Validate only this card's fields: another card's stored value that the
  // form schema would reject must not block this save.
  const schema = useMemo(
    () =>
      createChatbotSchema.pick(
        Object.fromEntries(fields.map((f) => [f, true])) as Record<
          keyof ChatbotFormData,
          true
        >,
      ),
    [fields],
  );

  const form = useForm<ChatbotFormInput, unknown, Partial<ChatbotFormData>>({
    resolver: zodResolver(schema) as never,
    defaultValues: Object.fromEntries(
      fields.map((f) => [f, chatbot[f as keyof ChatbotGetDetailResponseDto]]),
    ) as ChatbotFormInput,
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    // The update merges and JSON drops undefined, so a cleared field goes
    // out as null; otherwise the stored value would stay.
    const body = Object.fromEntries(
      fields.map((f) => [f, data[f] ?? null]),
    ) as ChatbotUpdateRequestDto;

    try {
      await mutateAsync({ id: chatbot.id, body });
      toast.success(t("chatbot.edit.success"));
      handleSuccess();
    } catch (error) {
      console.error("Failed to update chatbot", error);
      toast.error(t("chatbot.edit.error"));
    }
  });

  return (
    <RouteDrawer.Form form={form}>
      <KeyboundForm
        onSubmit={handleSubmit}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <RouteDrawer.Body className="flex flex-1 flex-col gap-y-6 overflow-y-auto">
          {children}
        </RouteDrawer.Body>
        <RouteDrawer.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteDrawer.Close asChild>
              <Button size="small" variant="secondary">
                {t("actions.cancel")}
              </Button>
            </RouteDrawer.Close>
            <Button size="small" type="submit" isLoading={isPending}>
              {t("actions.save")}
            </Button>
          </div>
        </RouteDrawer.Footer>
      </KeyboundForm>
    </RouteDrawer.Form>
  );
}

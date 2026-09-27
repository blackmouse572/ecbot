import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { useChatbot, useUpdateChatbot } from "@/hooks/api/chatbot";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { toast } from "@medusajs/ui";
import type {
  AccountListResponseDto,
  ChatbotUpdateRequestDto,
} from "@repo/client";
import { Skeleton } from "@repo/ui/common-components";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ChatbotForm } from "../../../components/chatbot-form";
import { CHATBOT_FORM_DEFAULTS } from "../../../constants";
import type { ChatbotFormData } from "../../../schemas";

export function ChatbotEditForm() {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const { workspaceSlug } = useWorkspaceParams();
  const { id } = useParams();
  const navigate = useNavigate();
  const { chatbot, isLoading, isError, error } = useChatbot(id || "", {
    enabled: !!id,
  });
  const { mutateAsync: updateChatbot, isPending } = useUpdateChatbot();

  const [defaultValues, setDefaultValues] = useState(CHATBOT_FORM_DEFAULTS);

  // The form takes account ids; the detail response carries whole accounts.
  useEffect(() => {
    if (!chatbot) return;

    const { accounts, ...rest } = chatbot;

    setDefaultValues({
      ...rest,
      extraInstructions:
        chatbot.extraInstructions ??
        (chatbot.agentProfile ? "" : (chatbot.generalKnowledge ?? "")),
      accounts: accounts.map((account: AccountListResponseDto) => account.id),
    });
  }, [chatbot]);

  const handleSubmit = async (data: ChatbotFormData) => {
    if (!id) {
      toast.error(t("chatbot.edit.error"));
      return;
    }

    try {
      // The update merges and JSON drops undefined, so a cleared field goes
      // out as null; otherwise the stored value would stay.
      const cleared = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value ?? null]),
      );
      const body: ChatbotUpdateRequestDto = {
        ...(cleared as A),
        name: data.name,
        extraInstructions: data.extraInstructions ?? "",
        agentProfile: chatbot?.agentProfile ?? undefined,
        accounts: data.accounts || [],
        type: (data.type ||
          CHATBOT_FORM_DEFAULTS.type) as ChatbotUpdateRequestDto["type"],
        autoRead: data.autoRead,
        typingIndicator: data.typingIndicator,
      };

      await updateChatbot({ id, body });
      toast.success(t("chatbot.edit.success"));
      handleSuccess();
    } catch (submitError) {
      console.error("Failed to update chatbot", submitError);
      toast.error(t("chatbot.edit.error"));
    }
  };

  const handleCancel = () => {
    navigate(`/${workspaceSlug}/chatbot`);
  };

  if (!id) {
    return <div className="p-6 text-red-500">{t("chatbot.edit.error")}</div>;
  }
  if (isLoading) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center p-16">
        <div className="flex w-full max-w-[720px] flex-col gap-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </div>
    );
  }
  if (isError) {
    return (
      <div className="p-6 text-red-500">
        {t("chatbot.edit.error")}: {error instanceof Error ? error.message : ""}
      </div>
    );
  }

  return (
    <RouteFocusModal>
      <ChatbotForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isPending={isPending}
        title={t("chatbot.edit.title")}
        submitText={t("chatbot.edit.save")}
        cancelText={t("chatbot.edit.cancel")}
        nameLabel={t("chatbot.edit.name")}
        typeLabel={t("chatbot.edit.type")}
        builderHref={
          chatbot?.agentProfile
            ? `/${workspaceSlug}/chatbot/create?chatbotId=${id}`
            : undefined
        }
      />
    </RouteFocusModal>
  );
}

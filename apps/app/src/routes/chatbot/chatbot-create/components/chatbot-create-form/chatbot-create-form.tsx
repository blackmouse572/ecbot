import { useRouteModal } from "@/components/modals";
import { useCreateChatbot } from "@/hooks/api";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { toast } from "@medusajs/ui";
import type { ChatbotCreateRequestDto } from "@repo/client";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChatbotForm } from "../../../components/chatbot-form";
import { CHATBOT_FORM_DEFAULTS } from "../../../constants";
import type { ChatbotFormData } from "../../../schemas";

export function ChatbotCreateForm() {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const { workspaceSlug } = useWorkspaceParams();
  const { mutateAsync: createChatbot, isPending } = useCreateChatbot();
  const navigate = useNavigate();

  const handleSubmit = async (data: ChatbotFormData) => {
    const chatbotData = {
      name: data.name,
      generalKnowledge: data.generalKnowledge || "",
      accounts: data.accounts || [],
      type: data.type || "beauty",
      autoRead: data.autoRead || false,
      typingIndicator: data.typingIndicator || false,
      primaryLanguage: data.primaryLanguage,
      deferedLanguage: data.deferedLanguage,
      welcomeMessage: data.welcomeMessage,
      fallbackMessage: data.fallbackMessage,
      modelTextName: data.modelTextName,
      modelTemperature: data.modelTemperature,
      maxTokens: data.maxTokens,
      handoffMessage: data.handoffMessage,
      handoffKeywords: data.handoffKeywords?.length
        ? data.handoffKeywords
        : undefined,
      handoffFallbackThreshold: data.handoffFallbackThreshold,
      guardrailEnabled: data.guardrailEnabled,
      guardrailModelEnabled: data.guardrailModelEnabled,
      guardrailCustomInstruction: data.guardrailCustomInstruction || undefined,
      guardrailEscalateOnBlock: data.guardrailEscalateOnBlock,
      followupRules: data.followupRules || undefined,
    } as ChatbotCreateRequestDto;

    toast.promise(
      createChatbot(chatbotData).then((v) => {
        handleSuccess();
        return v;
      }),
      {
        success: t("chatbot.create.success"),
        error: t("chatbot.create.error"),
        loading: t("chatbot.create.loading"),
      },
    );
  };

  const handleCancel = () => {
    navigate(`/${workspaceSlug}/chatbot`);
  };

  return (
    <ChatbotForm
      className="flex-1 overflow-y-auto"
      defaultValues={CHATBOT_FORM_DEFAULTS}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      isPending={isPending}
      title={t("chatbot.create.title")}
      submitText={t("actions.create")}
      cancelText={t("actions.cancel")}
      nameLabel={t("chatbot.create.name")}
      generalKnowledgeLabel={t("chatbot.create.generalKnowledge")}
      generalKnowledgePlaceholder={t(
        "chatbot.create.generalKnowledgePlaceholder",
      )}
      typeLabel={t("chatbot.edit.type")}
    />
  );
}

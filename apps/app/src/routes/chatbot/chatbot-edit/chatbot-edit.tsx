import { RouteDrawer } from "@/components/modals";
import { useChatbot } from "@/hooks/api/chatbot";
import { Heading } from "@medusajs/ui";
import { FormSkeleton } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  ChatbotGeneralFields,
  ChatbotMessageFields,
  ChatbotSettingsFields,
} from "../components/chatbot-form";
import {
  CHATBOT_GENERAL_FIELDS,
  CHATBOT_MESSAGE_FIELDS,
  CHATBOT_SETTINGS_FIELDS,
} from "../constants";
import { ChatbotEditForm } from "./components";

/**
 * A detail-page card's edit drawer: `edit` for the general card,
 * `edit/messages` and `edit/settings` for theirs. Each saves only its card's
 * fields, so no Edit button changes what another card shows.
 */
export function ChatbotEdit() {
  const { t } = useTranslation();
  const { id = "", section } = useParams();
  const { chatbot, isLoading, isError, error } = useChatbot(id, {
    enabled: !!id,
  });

  if (isError) {
    throw error;
  }

  const { title, fields, children } =
    section === "messages"
      ? {
          title: t("chatbot.details.messages.editTitle"),
          fields: CHATBOT_MESSAGE_FIELDS,
          children: <ChatbotMessageFields />,
        }
      : section === "settings"
        ? {
            title: t("chatbot.details.settings.editTitle"),
            fields: CHATBOT_SETTINGS_FIELDS,
            children: <ChatbotSettingsFields />,
          }
        : {
            title: t("chatbot.edit.title"),
            fields: CHATBOT_GENERAL_FIELDS,
            children: <ChatbotGeneralFields />,
          };

  return (
    <RouteDrawer>
      <RouteDrawer.Header>
        <RouteDrawer.Title asChild>
          <Heading>{title}</Heading>
        </RouteDrawer.Title>
        <RouteDrawer.Description className="sr-only">
          {title}
        </RouteDrawer.Description>
      </RouteDrawer.Header>
      {isLoading || !chatbot ? (
        <RouteDrawer.Body className="p-6">
          <FormSkeleton label={t("general.loading")} />
        </RouteDrawer.Body>
      ) : (
        <ChatbotEditForm chatbot={chatbot} fields={fields}>
          {children}
        </ChatbotEditForm>
      )}
    </RouteDrawer>
  );
}

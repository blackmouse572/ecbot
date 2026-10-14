import { RouteDrawer } from "@/components/modals";
import { useChatbot } from "@/hooks/api/chatbot";
import { Heading } from "@medusajs/ui";
import { FormSkeleton } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import type { FC } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  ChatbotGeneralFields,
  ChatbotMessageFields,
  ChatbotSettingsFields,
} from "../components/chatbot-form";
import { CHATBOT_EDIT_SECTIONS, CHATBOT_GENERAL_FIELDS } from "../constants";
import { ChatbotEditForm } from "./components";

const SECTION_FIELDS = {
  messages: ChatbotMessageFields,
  settings: ChatbotSettingsFields,
} satisfies Record<keyof typeof CHATBOT_EDIT_SECTIONS, FC>;

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

  if (section && !Object.hasOwn(CHATBOT_EDIT_SECTIONS, section)) {
    return <Navigate to=".." replace />;
  }

  const slug = section as keyof typeof CHATBOT_EDIT_SECTIONS | undefined;
  const Fields = slug ? SECTION_FIELDS[slug] : ChatbotGeneralFields;
  const title = t(
    slug ? CHATBOT_EDIT_SECTIONS[slug].titleKey : "chatbot.edit.title",
  );
  const fields = slug
    ? CHATBOT_EDIT_SECTIONS[slug].fields
    : CHATBOT_GENERAL_FIELDS;

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
          <Fields />
        </ChatbotEditForm>
      )}
    </RouteDrawer>
  );
}

import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { ChatbotNameCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-name-cell";
import { ChatbotTypeBadge } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-type-badge";
import { CHATBOT_TYPE_CONFIG } from "@/routes/chatbot/constants";
import type { AccountListResponseDto } from "@repo/client";
import { Link } from "react-router-dom";

type Props = { chatbot: AccountListResponseDto["chatbot"] };

/**
 * The agent answering on a channel, drawn like the agent list (face, name,
 * business type) and linked to its detail page.
 */
export const AccountChatbotCell = ({ chatbot }: Props) => {
  const { workspaceSlug } = useWorkspaceParams();

  if (!chatbot) return <div className="text-ui-fg-muted">-</div>;

  const config = CHATBOT_TYPE_CONFIG[chatbot.type];

  return (
    <Link
      to={`/${workspaceSlug}/${ROUTES.Chatbot}/${chatbot.id}`}
      className="flex min-w-0 max-w-96 items-center gap-2 hover:underline"
    >
      <ChatbotNameCell size="small" name={chatbot.name} />
      {config && <ChatbotTypeBadge config={config} size="xsmall" clamp />}
    </Link>
  );
};

import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { Text } from "@medusajs/ui";
import type { AccountListResponseDto } from "@repo/client";
import { Link } from "react-router-dom";

type Props = { chatbot: AccountListResponseDto["chatbot"] };

/** Names the agent answering on a channel, linked to its detail page. */
export const AccountChatbotCell = ({ chatbot }: Props) => {
  const { workspaceSlug } = useWorkspaceParams();

  if (!chatbot) return <div className="text-ui-fg-muted">-</div>;

  return (
    <Link
      to={`/${workspaceSlug}/${ROUTES.Chatbot}/${chatbot.id}`}
      className="text-ui-fg-interactive hover:underline"
    >
      <Text size="small">{chatbot.name}</Text>
    </Link>
  );
};

import { useChatbots } from "@/hooks/api/chatbot";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes";
import { ChatbotNameCell } from "@/routes/chatbot/chatbot-list/components/chatbot-list-table/chatbot-name-cell";
import { SidebarCollapsibleSection } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";

const RECENT_AGENTS_LIMIT = 3;

export const RecentAgentsSection = () => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { chatbots } = useChatbots({
    orderBy: "updatedAt",
    orderDirection: "DESC",
    page: 1,
    perPage: RECENT_AGENTS_LIMIT,
  });

  if (!chatbots?.length) {
    return null;
  }

  return (
    <SidebarCollapsibleSection label={t("recentAgents.title")}>
      <nav className="flex flex-col gap-y-0.5 px-3">
        {chatbots.map((chatbot) => (
          <NavLink
            key={chatbot.id}
            to={`/${workspaceSlug}/${ROUTES.Chatbot}/${chatbot.id}`}
            className="text-ui-fg-subtle transition-fg hover:bg-ui-bg-subtle-hover flex items-center rounded-md px-2 py-1 outline-none focus-visible:shadow-borders-focus"
          >
            <ChatbotNameCell name={chatbot.name} size="small" />
          </NavLink>
        ))}
      </nav>
    </SidebarCollapsibleSection>
  );
};

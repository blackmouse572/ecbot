import { useWorkspace } from "@/hooks/api/workspace";
import {
  AcademicCap,
  BellAlert,
  ChatBubbleLeftRight,
  FolderOpen,
  Puzzle,
  Sparkles,
  SquaresPlus,
  Users,
} from "@medusajs/icons";
import type { INavItem } from "@repo/ui/layout";
import { useTranslation } from "react-i18next";

import { LazyFeatureHint } from "@/components/guide";
import { ROUTES } from "@/routes";
import { enterpriseNavItems } from "@/routes/enterprise.nav";
import { BlockedAccountsBadge } from "./blocked-accounts-badge";
import { PausedConversationsBadge } from "./paused-conversations-badge";
import { PendingSuggestionsBadge } from "./pending-suggestions-badge";
import { ToolsAttentionBadge } from "./tools-attention-badge";

/** The workspace's main nav entries, shared by the sidebar and the command palette. */
export const useCoreRoutes = (): Omit<INavItem, "pathname">[] => {
  const { t } = useTranslation();
  const { workspace } = useWorkspace();
  const baseUrl = `/${workspace?.slug}`;

  return [
    {
      label: t("channels.title"),
      to: `${baseUrl}/${ROUTES.Accounts}`,
      icon: <SquaresPlus />,
      ability: {
        action: "manage",
        subject: "ACCOUNT",
      },
      hint: <LazyFeatureHint feature="accounts" icon={<SquaresPlus />} />,
      badge: <BlockedAccountsBadge />,
    },
    {
      label: t("customers.title"),
      to: `${baseUrl}/${ROUTES.Customers}`,
      icon: <Users />,
      ability: {
        action: "manage",
        subject: "CUSTOMER",
      },
      items: [
        {
          label: t("settings.customerTags.title"),
          to: `${baseUrl}/${ROUTES.CustomerTags}`,
        },
        {
          label: t("customers.suggestions.nav.label"),
          to: `${baseUrl}/${ROUTES.CustomerSuggestions}`,
          ability: {
            action: "manage",
            subject: "CUSTOMER",
          },
          badge: <PendingSuggestionsBadge />,
        },
      ],
    },
    {
      label: t("conversations.title"),
      to: `${baseUrl}/${ROUTES.Conversations}`,
      icon: <ChatBubbleLeftRight />,
      ability: {
        action: "manage",
        subject: "CHATBOT",
      },
      hint: (
        <LazyFeatureHint
          feature="conversations"
          icon={<ChatBubbleLeftRight />}
        />
      ),
      badge: <PausedConversationsBadge />,
    },
    {
      label: t("agents.title"),
      to: `${baseUrl}/${ROUTES.Chatbot}`,
      icon: <Sparkles />,
      ability: {
        action: "manage",
        subject: "CHATBOT",
      },
      hint: <LazyFeatureHint feature="chatbot" icon={<Sparkles />} />,
      items: [
        {
          label: t("knowledgeBase.title"),
          to: `${baseUrl}/${ROUTES.KnowledgeBase}`,
          icon: <FolderOpen />,
          ability: {
            action: "manage",
            subject: "KNOWLEDGE_BASE",
          },
          hint: <LazyFeatureHint feature="knowledge" icon={<FolderOpen />} />,
        },
        {
          label: t("tools.title"),
          to: `${baseUrl}/${ROUTES.Tools}`,
          icon: <Puzzle />,
          ability: {
            action: "manage",
            subject: "TOOL",
          },
          hint: <LazyFeatureHint feature="tools" icon={<Puzzle />} />,
          badge: <ToolsAttentionBadge />,
        },
        {
          label: t("skills.title"),
          to: `${baseUrl}/${ROUTES.Skills}`,
          icon: <AcademicCap />,
          ability: {
            action: "read",
            subject: "SKILL",
          },
          hint: <LazyFeatureHint feature="skills" icon={<AcademicCap />} />,
        },
        {
          label: t("followups.title"),
          to: `${baseUrl}/${ROUTES.Followups}`,
          icon: <BellAlert />,
          ability: {
            action: "read",
            subject: "CHATBOT",
          },
        },
        ...enterpriseNavItems({ t, baseUrl }),
      ],
    },
  ];
};

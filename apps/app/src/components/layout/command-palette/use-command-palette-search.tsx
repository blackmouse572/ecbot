import { useChatbots } from "@/hooks/api/chatbot";
import { useCustomers } from "@/hooks/api/customers";
import {
  useKnowledgeBases,
  useKnowledgeItems,
} from "@/hooks/api/knowledge-base";
import { useListSkills } from "@/hooks/api/skills";
import { useListTools } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes";
import {
  AcademicCap,
  FolderOpen,
  PlusMini,
  Puzzle,
  Sparkles,
  Users,
} from "@medusajs/icons";
import { useNavAccess } from "@repo/ui/layout";
import { useTranslation } from "react-i18next";
import { useDebounceValue } from "usehooks-ts";
import { RESULTS_PER_GROUP, SEARCH_DEBOUNCE_MS } from "./constants";
import type { CommandPaletteGroup, CommandPaletteItem } from "./types";

/**
 * Workspace data for the palette. With no query: recent agents and quick
 * actions. With one: a server search per entity the member may open.
 */
export const useCommandPaletteSearch = (query: string) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const can = useNavAccess();
  const [debounced] = useDebounceValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const search = query.trim() ? debounced : "";
  const searching = !!search;
  const base = `/${workspaceSlug}`;

  const canAgents = can({ action: "manage", subject: "CHATBOT" });
  const canCustomers = can({ action: "manage", subject: "CUSTOMER" });
  const canKnowledge = can({ action: "manage", subject: "KNOWLEDGE_BASE" });
  const canSkills = can({ action: "read", subject: "SKILL" });
  const canTools = can({ action: "manage", subject: "TOOL" });
  const page = { page: 1, perPage: RESULTS_PER_GROUP, search };

  // Same query as the sidebar's recent agents, so it is usually cached.
  const recent = useChatbots(
    { orderBy: "updatedAt", orderDirection: "DESC", page: 1, perPage: 3 },
    { enabled: canAgents && !searching },
  );
  const agents = useChatbots(page, { enabled: canAgents && searching });
  const customers = useCustomers(page, {
    enabled: canCustomers && searching,
  });
  const { knowledgeBases } = useKnowledgeBases({ enabled: canKnowledge });
  const knowledgeBaseId = knowledgeBases?.[0]?.id;
  const knowledge = useKnowledgeItems(knowledgeBaseId ?? "", page, {
    enabled: canKnowledge && searching && !!knowledgeBaseId,
  });
  const skills = useListSkills(workspaceSlug, page, {
    enabled: canSkills && searching,
  });
  const tools = useListTools(workspaceSlug, page, {
    enabled: canTools && searching,
  });

  const agentItem = (agent: { id: string; name: string }) => ({
    id: agent.id,
    label: agent.name,
    icon: <Sparkles />,
    to: `${base}/${ROUTES.Chatbot}/${agent.id}`,
  });

  if (!searching) {
    const candidates: (CommandPaletteItem | false | undefined)[] = [
      canAgents && {
        id: "create-agent",
        label: t("commandPalette.actions.createAgent"),
        icon: <PlusMini />,
        to: `${base}/${ROUTES.Chatbot}/create`,
      },
      canKnowledge &&
        knowledgeBaseId && {
          id: "add-knowledge",
          label: t("commandPalette.actions.addKnowledge"),
          icon: <PlusMini />,
          to: `${base}/${ROUTES.KnowledgeBase}/${knowledgeBaseId}/item/create`,
        },
      canSkills && {
        id: "create-skill",
        label: t("commandPalette.actions.createSkill"),
        icon: <PlusMini />,
        to: `${base}/${ROUTES.Skills}/create`,
      },
    ];
    const actions = candidates.filter(
      (item): item is CommandPaletteItem => !!item,
    );

    return {
      isSearching: false,
      groups: [
        {
          key: "recentAgents",
          heading: t("commandPalette.groups.recentAgents"),
          items: canAgents ? (recent.chatbots ?? []).map(agentItem) : [],
        },
        {
          key: "actions",
          heading: t("commandPalette.groups.actions"),
          items: actions,
        },
      ] satisfies CommandPaletteGroup[],
    };
  }

  const groups: CommandPaletteGroup[] = [
    {
      key: "agents",
      heading: t("commandPalette.groups.agents"),
      items: canAgents ? (agents.chatbots ?? []).map(agentItem) : [],
    },
    {
      key: "customers",
      heading: t("commandPalette.groups.customers"),
      items: canCustomers
        ? customers.customers.map((customer) => ({
            id: customer.id,
            label:
              customer.name ||
              customer.phone ||
              customer.email ||
              t("commandPalette.unnamedCustomer"),
            hint: (customer.name && (customer.phone || customer.email)) || "",
            icon: <Users />,
            customerId: customer.id,
          }))
        : [],
    },
    {
      key: "knowledge",
      heading: t("commandPalette.groups.knowledge"),
      items:
        canKnowledge && knowledgeBaseId
          ? (knowledge.items ?? []).map((item) => ({
              id: item.id,
              label: item.title,
              icon: <FolderOpen />,
              to: `${base}/${ROUTES.KnowledgeBase}/${knowledgeBaseId}/item/${item.id}`,
            }))
          : [],
    },
    {
      key: "skills",
      heading: t("commandPalette.groups.skills"),
      items: canSkills
        ? (skills.skills ?? []).map((skill) => ({
            id: skill.id,
            label: skill.name,
            icon: <AcademicCap />,
            to: `${base}/${ROUTES.Skills}/${skill.id}`,
          }))
        : [],
    },
    {
      key: "tools",
      heading: t("commandPalette.groups.tools"),
      items: canTools
        ? (tools.tools ?? []).map((tool) => ({
            id: tool.id,
            label: tool.displayName,
            icon: <Puzzle />,
            to: `${base}/${ROUTES.Tools}/${tool.id}`,
          }))
        : [],
    },
  ];

  const isSearching =
    query.trim() !== debounced ||
    [agents, customers, knowledge, skills, tools].some((q) => q.isFetching);

  return { isSearching, groups };
};

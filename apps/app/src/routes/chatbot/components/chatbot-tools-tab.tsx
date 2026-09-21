import {
  useDisableToolOnChatbot,
  useGetTool,
  useListChatbotTools,
  useUpdateEnabledActions,
  type ChatbotToolListItem,
} from "@/hooks/api/tools";
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  IconButton,
  Text,
  toast,
} from "@medusajs/ui";
import { Accordion } from "@repo/ui/components";
import { IconTrash } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ChatbotToolAddDrawer } from "./chatbot-tool-add-drawer";
import { ChevronDown, PlusMini } from "@medusajs/icons";

type ChatbotToolsTabProps = {
  chatbotId: string;
  workspace: string;
};

export function ChatbotToolsTab({
  chatbotId,
  workspace,
}: ChatbotToolsTabProps) {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { tools, isLoading, isError } = useListChatbotTools(
    workspace,
    chatbotId,
  );

  let toolsList: React.ReactNode;
  if (isError) {
    toolsList = (
      <Container className="p-0">
        <SectionHeader onAdd={() => setDrawerOpen(true)} />
        <div className="px-6 py-10 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.chatbotTab.loadError")}
          </Text>
        </div>
      </Container>
    );
  } else if (isLoading) {
    toolsList = (
      <Container className="p-0">
        <SectionHeader onAdd={() => setDrawerOpen(true)} />
        <div className="px-6 py-10 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.list.loading")}
          </Text>
        </div>
      </Container>
    );
  } else if (!tools || tools.length === 0) {
    toolsList = (
      <Container className="p-0">
        <SectionHeader onAdd={() => setDrawerOpen(true)} />
        <div className="px-6 py-12 text-center">
          <Heading level="h3">{t("tools.chatbotTab.empty.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.chatbotTab.empty.description")}
          </Text>
        </div>
      </Container>
    );
  } else {
    toolsList = (
      <Container className="p-0">
        <SectionHeader onAdd={() => setDrawerOpen(true)} />
        <div className="divide-y">
          {tools.map((tool) => (
            <ChatbotToolRow
              key={tool.id}
              tool={tool}
              chatbotId={chatbotId}
              workspace={workspace}
            />
          ))}
        </div>
      </Container>
    );
  }

  return (
    <>
      {toolsList}
      <ChatbotToolAddDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chatbotId={chatbotId}
        workspace={workspace}
        enabledToolIds={tools.map((tool) => tool.id)}
      />
    </>
  );
}

function SectionHeader({ onAdd }: { onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="px-6 py-4 border-b flex items-center justify-between">
      <div>
        <Heading level="h3" className="text-lg font-semibold">
          {t("tools.chatbotTab.title")}
        </Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("tools.chatbotTab.subtitle")}
        </Text>
      </div>
      <Button size="small" variant="secondary" onClick={onAdd}>
        <PlusMini />
        {t("actions.add")}
      </Button>
    </div>
  );
}

type ChatbotToolRowProps = {
  tool: ChatbotToolListItem;
  chatbotId: string;
  workspace: string;
};

function ChatbotToolRow({ tool, chatbotId, workspace }: ChatbotToolRowProps) {
  const { t } = useTranslation();

  const { disableToolOnChatbot, isPending: isDisabling } =
    useDisableToolOnChatbot(workspace, chatbotId);

  const handleRemove = async () => {
    try {
      await disableToolOnChatbot(tool.id);
      toast.success(t("tools.chatbotTab.removeSuccess"));
    } catch {
      toast.error(t("tools.chatbotTab.removeError"));
    }
  };

  const isMcp = tool.kind === "MCP";

  const rowContent = (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <Badge size="2xsmall" color={tool.kind === "MCP" ? "purple" : "blue"}>
        {tool.kind}
      </Badge>
      <div className="min-w-0">
        <Link
          to={`/${workspace}/tools/${tool.id}`}
          className="hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <Text weight="plus" className="truncate">
            {tool.name}
          </Text>
        </Link>
        {tool.description && (
          <Text size="small" className="text-ui-fg-subtle truncate">
            {tool.description}
          </Text>
        )}
      </div>
    </div>
  );

  const removeButton = (
    <IconButton
      variant="transparent"
      size="small"
      onClick={handleRemove}
      isLoading={isDisabling}
      disabled={isDisabling}
    >
      <IconTrash size={16} />
    </IconButton>
  );

  if (isMcp) {
    return (
      <Accordion type="single" collapsible>
        <Accordion.Item value={tool.id} className="border-b-0">
          <Accordion.Header
            className="py-4"
            trigger={
              <IconButton variant="transparent">
                <ChevronDown className="transform transition-transform group-data-[state=open]:rotate-180" />
              </IconButton>
            }
          >
            {rowContent}
            {removeButton}
          </Accordion.Header>
          <Accordion.Content className="!pl-6 !pr-6 pb-4">
            <McpActionsList
              toolId={tool.id}
              chatbotId={chatbotId}
              workspace={workspace}
              initialEnabledActions={tool.enabledActions}
            />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    );
  }

  return (
    <div className="px-6 py-4 flex items-center justify-between gap-4">
      {rowContent}
      {removeButton}
    </div>
  );
}

type McpActionsListProps = {
  toolId: string;
  chatbotId: string;
  workspace: string;
  initialEnabledActions: string[] | null;
};

type DiscoveredAction = {
  name: string;
  description?: string;
};

function McpActionsList({
  toolId,
  chatbotId,
  workspace,
  initialEnabledActions,
}: McpActionsListProps) {
  const { t } = useTranslation();
  const { tool, isLoading } = useGetTool(workspace, toolId);
  // null = all actions enabled (server semantic). We keep null in state to
  // avoid accidentally sending [] (none) on the first user interaction.
  const [enabledActions, setEnabledActions] = useState<string[] | null>(
    initialEnabledActions,
  );

  useEffect(() => {
    setEnabledActions((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(initialEnabledActions))
        return prev;
      return initialEnabledActions;
    });
  }, [initialEnabledActions]);

  const { updateEnabledActions, isPending } = useUpdateEnabledActions(
    workspace,
    chatbotId,
    toolId,
  );

  const actions = useMemo<DiscoveredAction[]>(() => {
    const raw = tool?.discoveredActions ?? [];
    return raw
      .map((a) => a as Partial<DiscoveredAction>)
      .filter(
        (a): a is DiscoveredAction =>
          typeof a?.name === "string" && a.name.length > 0,
      );
  }, [tool?.discoveredActions]);

  const toggleAction = async (name: string, checked: boolean) => {
    const prevActions = enabledActions;
    // null means all enabled — expand to full list before mutating
    const base = prevActions ?? actions.map((a) => a.name);
    const newList = checked
      ? Array.from(new Set([...base, name]))
      : base.filter((n) => n !== name);

    setEnabledActions(newList);

    try {
      await updateEnabledActions({ enabledActions: newList });
    } catch {
      setEnabledActions(prevActions);
      toast.error(t("tools.chatbotTab.actionsAutoSaveError"));
    }
  };

  return (
    <div className="mt-3 ml-6 rounded-md border bg-ui-bg-subtle p-3">
      <Text size="small" weight="plus">
        {t("tools.chatbotTab.actionsTitle")}
      </Text>
      {isLoading ? (
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {t("tools.list.loading")}
        </Text>
      ) : actions.length === 0 ? (
        <Text size="small" className="text-ui-fg-subtle mt-1">
          {t("tools.chatbotTab.actionsEmpty")}
        </Text>
      ) : (
        <ul className="mt-2 space-y-2">
          {actions.map((action) => {
            const checked =
              enabledActions === null || enabledActions.includes(action.name);
            return (
              <li key={action.name} className="flex items-start gap-2">
                <Checkbox
                  checked={checked}
                  disabled={isPending}
                  onCheckedChange={(v) => toggleAction(action.name, v === true)}
                />
                <div className="min-w-0">
                  <Text size="small" weight="plus">
                    {action.name}
                  </Text>
                  {action.description && (
                    <Text size="small" className="text-ui-fg-subtle">
                      {action.description}
                    </Text>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

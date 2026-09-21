import {
  useEnableToolOnChatbot,
  useGetTool,
  useListTools,
} from "@/hooks/api/tools";
import {
  Badge,
  Button,
  Checkbox,
  Divider,
  Drawer,
  Text,
  toast,
} from "@medusajs/ui";
import type { ReactNode } from "react";
import { Combobox } from "@repo/ui/common-components";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ToolListResponseDto } from "@repo/client";

type ChatbotToolAddDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  workspace: string;
  enabledToolIds: string[];
};

export function ChatbotToolAddDrawer({
  isOpen,
  onClose,
  chatbotId,
  workspace,
  enabledToolIds,
}: ChatbotToolAddDrawerProps) {
  const { t } = useTranslation();
  const [selectedToolId, setSelectedToolId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedActions, setSelectedActions] = useState<string[] | null>(null);

  const { tools } = useListTools(workspace, { perPage: 100 });
  const { enableToolOnChatbot, isPending } = useEnableToolOnChatbot(
    workspace,
    chatbotId,
  );

  const availableTools = useMemo(
    () =>
      (tools ?? []).filter(
        (tool) => !enabledToolIds.includes(tool.id) && tool.status === "ACTIVE",
      ),
    [tools, enabledToolIds],
  );

  const filteredOptions = useMemo(() => {
    return availableTools
      .filter(
        (tool) =>
          !searchQuery ||
          tool.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .map((tool) => ({
        label: tool.name,
        value: tool.id,
        labelNode: (
          <span className="flex items-center justify-between gap-2 w-full min-w-0">
            <span className="truncate">{tool.name}</span>
            <Badge
              size="2xsmall"
              className="shrink-0"
              color={tool.kind === "MCP" ? "purple" : "blue"}
            >
              {tool.kind}
            </Badge>
          </span>
        ) as ReactNode,
      }));
  }, [availableTools, searchQuery]);

  const selectedTool = useMemo(
    () => availableTools.find((tool) => tool.id === selectedToolId),
    [availableTools, selectedToolId],
  );

  const isMcp = selectedTool?.kind === "MCP";

  const { tool: toolDetail, isLoading: isLoadingDetail } = useGetTool(
    workspace,
    selectedToolId,
    { enabled: !!selectedToolId && isMcp },
  );

  const discoveredActions = useMemo(() => {
    if (!isMcp || !toolDetail?.discoveredActions) return [];
    return (
      toolDetail.discoveredActions as Array<{
        name: string;
        description?: string;
      }>
    ).filter((a) => typeof a?.name === "string" && a.name.length > 0);
  }, [isMcp, toolDetail?.discoveredActions]);

  const handleSelectTool = (id: string) => {
    setSelectedToolId(id ?? "");
    setSelectedActions(null);
  };

  const toggleAction = (name: string, checked: boolean) => {
    setSelectedActions((prev) => {
      const base = prev ?? discoveredActions.map((a) => a.name);
      return checked
        ? Array.from(new Set([...base, name]))
        : base.filter((n) => n !== name);
    });
  };

  const resetState = () => {
    setSelectedToolId("");
    setSearchQuery("");
    setSelectedActions(null);
  };

  const handleAdd = async () => {
    if (!selectedToolId) return;
    try {
      await enableToolOnChatbot({
        toolId: selectedToolId,
        body: isMcp ? ({ enabledActions: selectedActions } as never) : {},
      });
      toast.success(t("tools.addDrawer.enableSuccess"));
      resetState();
      onClose();
    } catch {
      toast.error(t("tools.addDrawer.enableError"));
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
      onClose();
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("tools.addDrawer.title")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Text size="small">{t("tools.addDrawer.selectLabel")}</Text>
            <Combobox
              value={selectedToolId}
              searchValue={searchQuery}
              options={filteredOptions}
              onChange={(v) => v && handleSelectTool(v)}
              onSearchValueChange={setSearchQuery}
            />
          </div>
          {selectedTool && (
            <ToolDetailPanel
              tool={selectedTool}
              isMcp={!!isMcp}
              isLoadingDetail={isLoadingDetail}
              discoveredActions={discoveredActions}
              selectedActions={selectedActions}
              onToggleAction={toggleAction}
            />
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center gap-2 ml-auto">
            <Drawer.Close asChild>
              <Button variant="secondary">{t("actions.cancel")}</Button>
            </Drawer.Close>
            <Button
              onClick={handleAdd}
              isLoading={isPending}
              disabled={!selectedToolId || isPending}
            >
              {t("actions.add")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

type ToolDetailPanelProps = {
  tool: ToolListResponseDto;
  isMcp: boolean;
  isLoadingDetail: boolean;
  discoveredActions: Array<{ name: string; description?: string }>;
  selectedActions: string[] | null;
  onToggleAction: (name: string, checked: boolean) => void;
};

function ToolDetailPanel({
  tool,
  isMcp,
  isLoadingDetail,
  discoveredActions,
  selectedActions,
  onToggleAction,
}: ToolDetailPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="rounded-md border bg-ui-bg-subtle p-0 flex flex-col gap-3">
      <div className="flex items-start gap-3 p-3 pb-0">
        <Badge size="2xsmall" color={tool.kind === "MCP" ? "purple" : "blue"}>
          {tool.kind}
        </Badge>
        <div className="min-w-0">
          <Text weight="plus" className="truncate">
            {tool.name}
          </Text>
          {tool.description && (
            <Text size="small" className="text-ui-fg-subtle">
              {tool.description}
            </Text>
          )}
        </div>
      </div>
      <Divider />
      {isMcp && (
        <div className="flex flex-col gap-2 p-3 pt-0">
          <Text size="small" weight="plus">
            {t("tools.addDrawer.actionsTitle")}
          </Text>
          {isLoadingDetail ? (
            <Text size="small" className="text-ui-fg-subtle">
              {t("tools.list.loading")}
            </Text>
          ) : discoveredActions.length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              {t("tools.chatbotTab.actionsEmpty")}
            </Text>
          ) : (
            <ul className="space-y-2">
              {discoveredActions.map((action) => {
                const checked =
                  selectedActions === null ||
                  selectedActions.includes(action.name);
                return (
                  <li key={action.name} className="flex items-start gap-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        onToggleAction(action.name, v === true)
                      }
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
      )}
    </div>
  );
}

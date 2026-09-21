import {
  useAttachSkillToChatbot,
  useGetSkill,
  useListSkills,
} from "@/hooks/api/skills";
import { Badge, Divider, Button, Drawer, Text, toast } from "@medusajs/ui";
import type { SkillListResponseDto } from "@repo/client";
import { Combobox } from "@repo/ui/common-components";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  chatbotId: string;
  workspace: string;
  attachedSkillIds: string[];
};

export function ChatbotSkillAddDrawer({
  isOpen,
  onClose,
  chatbotId,
  workspace,
  attachedSkillIds,
}: Props) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");

  const { skills } = useListSkills(workspace, {
    source: "workspace",
    perPage: 100,
  });
  const { attachSkillToChatbot, isPending } = useAttachSkillToChatbot(
    workspace,
    chatbotId,
  );

  const available = useMemo(
    () =>
      (skills ?? []).filter(
        (s) => !attachedSkillIds.includes(s.id) && s.status === "ACTIVE",
      ),
    [skills, attachedSkillIds],
  );

  const options = useMemo(
    () =>
      available
        .filter(
          (s) => !search || s.name.toLowerCase().includes(search.toLowerCase()),
        )
        .map((s) => ({ label: s.name, value: s.id })),
    [available, search],
  );

  const selectedSkill = useMemo(
    () => available.find((s) => s.id === selectedId),
    [available, selectedId],
  );

  const { skill: skillDetail, isLoading: isLoadingDetail } = useGetSkill(
    workspace,
    selectedId,
    { enabled: !!selectedId },
  );

  const reset = () => {
    setSelectedId("");
    setSearch("");
  };

  const handleAdd = async () => {
    if (!selectedId) return;
    try {
      await attachSkillToChatbot({ skillId: selectedId });
      toast.success(t("skills.chatbotTab.attachSuccess"));
      reset();
      onClose();
    } catch {
      toast.error(t("skills.chatbotTab.attachError"));
    }
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) {
          reset();
          onClose();
        }
      }}
    >
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("skills.chatbotTab.addTitle")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <Text size="small">{t("skills.chatbotTab.selectLabel")}</Text>
          <Combobox
            value={selectedId}
            searchValue={search}
            options={options}
            onChange={(v) => v && setSelectedId(v)}
            onSearchValueChange={setSearch}
          />
          {available.length === 0 && (
            <Text size="small" className="text-ui-fg-subtle">
              {t("skills.chatbotTab.noAvailable")}
            </Text>
          )}
          {selectedSkill && (
            <SkillDetailPanel
              skill={selectedSkill}
              content={skillDetail?.instructions}
              isLoadingDetail={isLoadingDetail}
            />
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <div className="ml-auto flex items-center gap-2">
            <Drawer.Close asChild>
              <Button variant="secondary">{t("actions.cancel")}</Button>
            </Drawer.Close>
            <Button
              onClick={handleAdd}
              isLoading={isPending}
              disabled={!selectedId || isPending}
            >
              {t("actions.add")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

type SkillDetailPanelProps = {
  skill: SkillListResponseDto;
  content?: string;
  isLoadingDetail: boolean;
};

// Preview of the selected skill's instructions — mirrors ChatbotToolAddDrawer's
// ToolDetailPanel so both "attach" drawers feel consistent.
function SkillDetailPanel({
  skill,
  content,
  isLoadingDetail,
}: SkillDetailPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-ui-bg-subtle flex flex-col gap-3 rounded-md border p-0">
      <div className="flex items-start gap-3 p-3 pb-0">
        {skill.isBuiltin && (
          <Badge size="2xsmall" color="purple">
            {t("skills.builtin")}
          </Badge>
        )}
        <div className="min-w-0">
          <Text weight="plus" className="truncate">
            {skill.name}
          </Text>
          {skill.description && (
            <Text size="small" className="text-ui-fg-subtle">
              {skill.description}
            </Text>
          )}
        </div>
      </div>
      <Divider />
      <div className="p-3 pt-0">
        {isLoadingDetail ? (
          <Text size="small" className="text-ui-fg-subtle">
            {t("skills.list.loading")}
          </Text>
        ) : (
          <div className="prose prose-sm max-h-64 max-w-none overflow-y-auto txt-compact-small text-ui-fg-subtle">
            <ReactMarkdown
              components={{
                ul: ({ children }) => (
                  <ul className="list-disc pl-5">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5">{children}</ol>
                ),
              }}
            >
              {content ?? ""}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

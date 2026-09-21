import { TipTapEditor } from "@/components/common/tiptap-editor/tiptap-editor";
import { useUpdateSkill } from "@/hooks/api/skills";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { Pencil } from "@medusajs/icons";
import { Button, Container, Heading, IconButton, toast } from "@medusajs/ui";
import type { SkillGetResponseDto } from "@repo/client";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";

type Props = {
  skill: SkillGetResponseDto;
};

// Markdown view + inline edit for the skill instructions (mirrors the chatbot
// general-knowledge section). Builtin templates are read-only.
export const SkillInstructionsSection = ({ skill }: Props) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { updateSkill, isPending } = useUpdateSkill(workspaceSlug, skill.id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(skill.instructions ?? "");

  const handleSave = async () => {
    try {
      await updateSkill({ instructions: draft });
      toast.success(t("skills.edit.success"));
      setEditing(false);
    } catch {
      toast.error(t("skills.edit.error"));
    }
  };

  const handleCancel = () => {
    setDraft(skill.instructions ?? "");
    setEditing(false);
  };

  // Esc cancels the edit while the editor is open
  useHotkey("Escape", handleCancel, { enabled: editing });

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between p-6 py-4">
        <Heading>{t("skills.form.instructions")}</Heading>
        {!skill.isBuiltin && !editing && (
          <IconButton
            variant="transparent"
            size="small"
            onClick={() => {
              setDraft(skill.instructions ?? "");
              setEditing(true);
            }}
          >
            <Pencil />
          </IconButton>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-4">
          <TipTapEditor
            className="rounded-none border-t-0 border-x-0"
            value={draft}
            onChange={setDraft}
            placeholder={t("skills.form.instructionsHint")}
            format="markdown"
          />
          <div className="flex justify-end gap-2 p-6 pb-4 pt-0">
            <Button variant="secondary" size="small" onClick={handleCancel}>
              {t("actions.cancel")}
            </Button>
            <Button size="small" isLoading={isPending} onClick={handleSave}>
              {t("actions.save")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="scroll-fade-y prose max-w-none max-h-96 overflow-y-auto p-6 py-4 txt-compact-small text-ui-fg-subtle">
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
            {skill.instructions ?? ""}
          </ReactMarkdown>
        </div>
      )}
    </Container>
  );
};

import { skillDetailQueryOptions, useListSkills } from "@/hooks/api/skills";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ArrowUpTray, Sparkles, Spinner } from "@medusajs/icons";
import { Button, Text, toast } from "@medusajs/ui";
import type { SkillGetResponseDto } from "@repo/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FC } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  onTemplate: (skill: SkillGetResponseDto) => void;
  onImport: (text: string) => void;
};

// "Get started with" row on an empty create form: import a file, or fill the
// whole form from a builtin template.
export const SkillStartChips: FC<Props> = ({ onTemplate, onImport }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const { skills: templates } = useListSkills(workspaceSlug, {
    source: "template",
    perPage: 20,
  });

  const pick = async (id: string) => {
    setLoading(id);
    try {
      const res = await queryClient.fetchQuery(
        skillDetailQueryOptions(workspaceSlug, id),
      );
      onTemplate(res.data as SkillGetResponseDto);
    } catch {
      toast.error(t("skills.start.error"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-y-2">
      <Text size="small" className="text-ui-fg-subtle">
        {t("skills.start.title")}
      </Text>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="small"
          variant="secondary"
          className="rounded-full"
          onClick={() => fileRef.current?.click()}
        >
          <ArrowUpTray />
          {t("skills.start.import")}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".md,.markdown,.txt,text/markdown,text/plain"
          className="hidden"
          aria-label={t("skills.start.import")}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onImport(await file.text());
          }}
        />
        {templates?.map((tpl) => (
          <Button
            key={tpl.id}
            type="button"
            size="small"
            variant="secondary"
            className="rounded-full"
            disabled={!!loading}
            onClick={() => pick(tpl.id)}
          >
            {/* Swap the icon: Button's own isLoading wraps the content in a
                block span, which stacks the icon over the label. */}
            {loading === tpl.id ? (
              <Spinner className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            {tpl.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

import { useTranslation } from "react-i18next";
import type { RagSource } from "@/types/chat-message";

export function AIChatSources({ sources }: { sources: RagSource[] }) {
  const { t } = useTranslation();
  if (!sources.length) return null;
  return (
    <div className="mt-2 flex flex-col gap-1 border-t border-ui-border-base pt-2">
      <span className="text-ui-fg-muted text-xs">
        {t("chatbot.chat.sources.label")}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {sources.map((s) => {
          const chip = (
            <span className="bg-ui-bg-subtle text-ui-fg-subtle rounded-md px-2 py-0.5 text-xs">
              {s.id} · {s.filename}
            </span>
          );
          return s.sourceUrl ? (
            <a
              key={s.id}
              href={s.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:opacity-80"
            >
              {chip}
            </a>
          ) : (
            <span key={s.id}>{chip}</span>
          );
        })}
      </div>
    </div>
  );
}

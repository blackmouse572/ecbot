import { clx } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { MessageAttachment } from "@/types/chat-message";

interface Props {
  attachments: MessageAttachment[] | undefined;
  align: "start" | "end";
}

/** Image attachments of a message (customer photos, images the bot sent). */
export const MessageImages: FC<Props> = ({ attachments, align }) => {
  const { t } = useTranslation();
  const urls = (attachments ?? [])
    .filter((a) => a.type === "image" && a.url)
    .map((a) => a.url as string);
  if (urls.length === 0) return null;

  return (
    <div
      className={clx(
        "flex flex-wrap gap-2",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      {urls.map((url, i) => (
        <a key={`${url}-${i}`} href={url} target="_blank" rel="noreferrer">
          <img
            src={url}
            alt={t("conversations.image")}
            loading="lazy"
            className="border-ui-border-base max-h-60 max-w-60 rounded-lg border object-cover"
          />
        </a>
      ))}
    </div>
  );
};

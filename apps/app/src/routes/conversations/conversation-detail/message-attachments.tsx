import { DocumentText, Link, MapPin, PaperClip } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import type { MessageAttachment } from "@/types/chat-message";
import { AttachmentChip } from "./attachment-chip";
import { MediaPlayer } from "./media-player";

interface Props {
  attachments: MessageAttachment[] | undefined;
  align: "start" | "end";
  /** The message replies to the business's story (else a story is a mention). */
  storyReply?: boolean;
}

/** What a message carries besides its text: photos, stickers, stories,
 *  voice notes, videos, files and shared posts. */
export const MessageAttachments: FC<Props> = ({
  attachments,
  align,
  storyReply,
}) => {
  const { t } = useTranslation();
  if (!attachments?.length) return null;

  const render = (a: MessageAttachment, key: string) => {
    switch (a.type) {
      case "image":
        return a.url ? (
          <a key={key} href={a.url} target="_blank" rel="noreferrer">
            <img
              src={a.url}
              alt={t("conversations.image")}
              loading="lazy"
              className="border-ui-border-base max-h-60 max-w-60 rounded-lg border object-cover"
            />
          </a>
        ) : null;
      case "sticker":
        // Drawn like Messenger does: no frame, no bubble.
        return a.url ? (
          <img
            key={key}
            src={a.url}
            alt={t("conversations.sticker")}
            loading="lazy"
            className="size-28 object-contain"
          />
        ) : (
          <span
            key={key}
            role="img"
            aria-label={t("conversations.sticker")}
            className="text-5xl leading-none"
          >
            {a.emoji ?? "🙂"}
          </span>
        );
      case "story": {
        const label = t(
          storyReply
            ? "conversations.attachment.storyReply"
            : "conversations.attachment.storyMention",
        );
        return (
          <figure key={key} className="flex flex-col gap-1">
            <figcaption className="txt-compact-xsmall text-ui-fg-muted">
              {label}
            </figcaption>
            {a.url ? (
              <a href={a.url} target="_blank" rel="noreferrer">
                <img
                  src={a.url}
                  alt={label}
                  loading="lazy"
                  className="border-ui-border-base h-48 w-28 rounded-lg border object-cover"
                />
              </a>
            ) : (
              <div className="border-ui-border-base bg-ui-bg-component h-48 w-28 rounded-lg border" />
            )}
          </figure>
        );
      }
      case "audio":
      case "video":
        return <MediaPlayer key={key} kind={a.type} url={a.url} />;
      case "file":
        return (
          <AttachmentChip
            key={key}
            icon={<PaperClip />}
            label={t("conversations.attachment.file")}
            url={a.url}
          />
        );
      case "share":
        return (
          <AttachmentChip
            key={key}
            icon={<Link />}
            label={t("conversations.attachment.share")}
            url={a.url}
          />
        );
      case "location":
        return (
          <AttachmentChip
            key={key}
            icon={<MapPin />}
            label={t("conversations.attachment.location")}
            url={a.url}
          />
        );
      default:
        return (
          <AttachmentChip
            key={key}
            icon={<DocumentText />}
            label={t("conversations.attachment.unsupported")}
          />
        );
    }
  };

  return (
    <div
      className={clx(
        "flex flex-wrap items-end gap-2",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      {attachments.map((a, i) => render(a, `${a.type}-${a.url ?? ""}-${i}`))}
    </div>
  );
};

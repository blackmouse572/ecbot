import {
  DocumentText,
  Link,
  MapPin,
  MediaPlay,
  PaperClip,
} from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { MessageAttachment } from "@/types/chat-message";

interface Props {
  attachments: MessageAttachment[] | undefined;
  align: "start" | "end";
  /** The message replies to the business's story (else a story is a mention). */
  storyReply?: boolean;
}

const chipClass =
  "txt-compact-small border-ui-border-base bg-ui-bg-component text-ui-fg-subtle flex items-center gap-1.5 rounded-lg border px-3 py-2";

const Chip: FC<{ icon: ReactNode; label: string; url?: string }> = ({
  icon,
  label,
  url,
}) =>
  url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className={clx(chipClass, "hover:bg-ui-bg-component-hover")}
    >
      {icon}
      {label}
    </a>
  ) : (
    <span className={chipClass}>
      {icon}
      {label}
    </span>
  );

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
        return a.url ? (
          <audio key={key} controls preload="none" src={a.url} />
        ) : (
          <Chip
            key={key}
            icon={<MediaPlay />}
            label={t("conversations.attachment.voice")}
          />
        );
      case "video":
        return a.url ? (
          <video
            key={key}
            controls
            preload="metadata"
            src={a.url}
            className="border-ui-border-base max-h-60 max-w-60 rounded-lg border"
          />
        ) : (
          <Chip
            key={key}
            icon={<MediaPlay />}
            label={t("conversations.attachment.video")}
          />
        );
      case "file":
        return (
          <Chip
            key={key}
            icon={<PaperClip />}
            label={t("conversations.attachment.file")}
            url={a.url}
          />
        );
      case "share":
        return (
          <Chip
            key={key}
            icon={<Link />}
            label={t("conversations.attachment.share")}
            url={a.url}
          />
        );
      case "location":
        return (
          <Chip
            key={key}
            icon={<MapPin />}
            label={t("conversations.attachment.location")}
            url={a.url}
          />
        );
      default:
        return (
          <Chip
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

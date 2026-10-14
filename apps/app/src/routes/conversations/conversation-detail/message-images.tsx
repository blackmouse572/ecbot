import { clx } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { FileLink } from "@/components/common/file-link";
import type { MessageAttachment } from "@/types/chat-message";

interface Props {
  attachments: MessageAttachment[] | undefined;
  align: "start" | "end";
}

/** Image and file attachments of a message (customer photos, images and
 *  files such as PDFs the bot sent). */
export const MessageImages: FC<Props> = ({ attachments, align }) => {
  const { t } = useTranslation();
  const shown = (attachments ?? []).filter(
    (a): a is MessageAttachment & { url: string } =>
      (a.type === "image" || a.type === "file") && !!a.url,
  );
  if (shown.length === 0) return null;

  return (
    <div
      className={clx(
        "flex flex-wrap gap-2",
        align === "end" ? "justify-end" : "justify-start",
      )}
    >
      {shown.map((a, i) =>
        a.type === "file" ? (
          <FileLink key={`${a.url}-${i}`} url={a.url} name={a.name} />
        ) : (
          <a
            key={`${a.url}-${i}`}
            href={a.url}
            target="_blank"
            rel="noreferrer"
          >
            <img
              src={a.url}
              alt={t("conversations.image")}
              loading="lazy"
              className="border-ui-border-base max-h-60 max-w-60 rounded-lg border object-cover"
            />
          </a>
        ),
      )}
    </div>
  );
};

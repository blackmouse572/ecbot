import { XMarkMini } from "@medusajs/icons";
import { toast } from "@medusajs/ui";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
  PromptInputHeader,
  usePromptInputAttachments,
} from "@repo/ui/common-components";
import { FileType } from "@repo/ui/components/ui/file-type";
import { type FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { chatFileType } from "./chat-message-media";
import { CHAT_ATTACH_MAX_IMAGES } from "./constants";

const isImage = (file: { mediaType: string }) =>
  file.mediaType.startsWith("image/");

/** The files waiting to go with the next message, each with a remove button.
 *  A message carries either one file or up to 10 photos: what was added
 *  last decides which, and the rest is dropped with a toast. */
export const AIChatInputAttachments: FC = () => {
  const { files, remove } = usePromptInputAttachments();
  const { t } = useTranslation();

  useEffect(() => {
    const last = files.at(-1);
    if (!last) return;
    const extra = isImage(last)
      ? [
          ...files.filter((f) => !isImage(f)),
          ...files.filter(isImage).slice(CHAT_ATTACH_MAX_IMAGES),
        ]
      : files.filter((f) => f.id !== last.id);
    if (!extra.length) return;
    for (const file of extra) remove(file.id);
    toast.info(
      t("chatbot.chat.attachLimit", { count: CHAT_ATTACH_MAX_IMAGES }),
    );
  }, [files, remove, t]);

  if (files.length === 0) return null;

  return (
    <PromptInputHeader className="px-3 pt-3" data-testid="chat-attachments">
      {files.map((file) => {
        const image = isImage(file);
        const name = file.filename ?? file.mediaType;
        return (
          <Attachment key={file.id} size="xs" className="max-w-[180px]">
            <AttachmentMedia
              variant={image ? "image" : "icon"}
              className={image ? undefined : "bg-transparent"}
            >
              {image ? (
                <img
                  src={file.url}
                  alt={name}
                  className="size-full object-cover"
                />
              ) : (
                <FileType type={chatFileType(file)} size="mini" />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{name}</AttachmentTitle>
            </AttachmentContent>
            <AttachmentActions>
              <AttachmentAction
                aria-label={t("chatbot.chat.removeAttachment", { name })}
                onClick={() => remove(file.id)}
              >
                <XMarkMini />
              </AttachmentAction>
            </AttachmentActions>
          </Attachment>
        );
      })}
    </PromptInputHeader>
  );
};

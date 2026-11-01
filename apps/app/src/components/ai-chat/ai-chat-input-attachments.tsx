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
import { CHAT_ATTACH_MAX_DOCUMENTS, CHAT_ATTACH_MAX_IMAGES } from "./constants";

/** The files waiting to go with the next message, each with a remove button.
 *  Keeps the input to 10 photos and one other file: extras are dropped with
 *  a toast as they are added. */
export const AIChatInputAttachments: FC = () => {
  const { files, remove } = usePromptInputAttachments();
  const { t } = useTranslation();

  useEffect(() => {
    const images = files.filter((f) => f.mediaType.startsWith("image/"));
    const documents = files.filter((f) => !f.mediaType.startsWith("image/"));
    const extra = [
      ...images.slice(CHAT_ATTACH_MAX_IMAGES),
      ...documents.slice(CHAT_ATTACH_MAX_DOCUMENTS),
    ];
    if (!extra.length) return;
    for (const file of extra) remove(file.id);
    toast.error(
      t("chatbot.chat.attachTooMany", {
        images: CHAT_ATTACH_MAX_IMAGES,
        files: CHAT_ATTACH_MAX_DOCUMENTS,
      }),
    );
  }, [files, remove, t]);

  if (files.length === 0) return null;

  return (
    <PromptInputHeader className="px-3 pt-3" data-testid="chat-attachments">
      {files.map((file) => {
        const isImage = file.mediaType.startsWith("image/");
        const name = file.filename ?? file.mediaType;
        return (
          <Attachment key={file.id} size="xs" className="max-w-[180px]">
            <AttachmentMedia
              variant={isImage ? "image" : "icon"}
              className={isImage ? undefined : "bg-transparent"}
            >
              {isImage ? (
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

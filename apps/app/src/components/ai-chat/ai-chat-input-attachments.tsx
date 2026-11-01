import { DocumentText, XMarkMini } from "@medusajs/icons";
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
import type { FC } from "react";
import { useTranslation } from "react-i18next";

/** The files waiting to go with the next message, each with a remove button. */
export const AIChatInputAttachments: FC = () => {
  const { files, remove } = usePromptInputAttachments();
  const { t } = useTranslation();
  if (files.length === 0) return null;

  return (
    <PromptInputHeader className="px-3 pt-3" data-testid="chat-attachments">
      {files.map((file) => {
        const isImage = file.mediaType.startsWith("image/");
        const name = file.filename ?? file.mediaType;
        return (
          <Attachment key={file.id} size="xs" className="max-w-[180px]">
            <AttachmentMedia variant={isImage ? "image" : "icon"}>
              {isImage ? (
                <img
                  src={file.url}
                  alt={name}
                  className="size-full object-cover"
                />
              ) : (
                <DocumentText />
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

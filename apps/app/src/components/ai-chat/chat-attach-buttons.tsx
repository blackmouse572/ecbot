import { PaperClip, Photo } from "@medusajs/icons";
import { toast } from "@medusajs/ui";
import {
  PromptInputButton,
  usePromptInputAttachments,
} from "@repo/ui/common-components";
import { type ChangeEvent, type FC, useRef } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  /** MIME types the Photo button picks; no button when absent. */
  imageAccept?: string;
  /** MIME types the paperclip picks; no button when absent. */
  fileAccept?: string;
  /** Largest size per kind; a bigger pick is refused with a notice. */
  maxBytes?: { image?: number; file?: number };
};

/** A photo button and a file button, each opening a picker for its kind. */
export const ChatAttachButtons: FC<Props> = ({
  imageAccept,
  fileAccept,
  maxBytes,
}) => {
  const { add } = usePromptInputAttachments();
  const { t } = useTranslation();
  const photos = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);

  const onPick =
    (kind: "image" | "file") => (event: ChangeEvent<HTMLInputElement>) => {
      const picked = Array.from(event.target.files ?? []);
      event.target.value = "";
      const max = maxBytes?.[kind];
      const fits = max ? picked.filter((f) => f.size <= max) : picked;
      if (fits.length < picked.length) {
        toast.error(t("chatbot.chat.attachTooBig"));
      }
      if (fits.length) add(fits);
    };

  return (
    <>
      {imageAccept && (
        <>
          <PromptInputButton
            variant="transparent"
            tooltip={t("chatbot.chat.attachPhotos")}
            aria-label={t("chatbot.chat.attachPhotos")}
            data-testid="chat-attach-photos"
            onClick={() => photos.current?.click()}
          >
            <Photo />
          </PromptInputButton>
          <input
            ref={photos}
            type="file"
            accept={imageAccept}
            multiple
            hidden
            data-testid="chat-photos-input"
            onChange={onPick("image")}
          />
        </>
      )}
      {fileAccept && (
        <>
          <PromptInputButton
            variant="transparent"
            tooltip={t("chatbot.chat.attachFile")}
            aria-label={t("chatbot.chat.attachFile")}
            data-testid="chat-attach-file"
            onClick={() => file.current?.click()}
          >
            <PaperClip />
          </PromptInputButton>
          <input
            ref={file}
            type="file"
            accept={fileAccept}
            hidden
            data-testid="chat-file-input"
            onChange={onPick("file")}
          />
        </>
      )}
    </>
  );
};

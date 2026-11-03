import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@repo/ui/common-components";
import { FileType, getFileType } from "@repo/ui/components/ui/file-type";
import { clx } from "@medusajs/ui";
import type { FC } from "react";
import type { RenderModelFile } from "./use-ai-chat-stream";

/** A file's type label (PDF, DOCX, ...): from its name, else its mime. */
export const chatFileType = (file: { filename?: string; mediaType: string }) =>
  getFileType(file.filename?.includes(".") ? file.filename : file.mediaType);

const isImage = (file: RenderModelFile) => file.mediaType.startsWith("image/");

type Props = {
  files: RenderModelFile[];
  /** Which side of the chat the media sits on. */
  align: "start" | "end";
};

/**
 * Photos and files sent in a message, drawn outside the text bubble the way
 * Messenger draws them: photos as pictures (a grid when there are several),
 * files as chips with the same type icon the knowledge base uses.
 */
export const ChatMessageMedia: FC<Props> = ({ files, align }) => {
  const images = files.filter(isImage);
  const others = files.filter((file) => !isImage(file));
  if (files.length === 0) return null;

  return (
    <div
      className={clx(
        "flex max-w-[min(100%,320px)] flex-col gap-1",
        align === "end" ? "items-end self-end" : "items-start self-start",
      )}
      data-testid="chat-media"
    >
      {images.length > 0 && (
        <div
          className={clx(
            "grid gap-1",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {images.map((file, index) => (
            <img
              key={`${file.url}-${index}`}
              src={file.url}
              alt={file.filename ?? file.mediaType}
              className={clx(
                "rounded-2xl border border-ui-border-base object-cover",
                images.length === 1
                  ? "max-h-64 max-w-full"
                  : "aspect-square size-full max-w-[158px]",
              )}
            />
          ))}
        </div>
      )}
      {others.map((file, index) => (
        <Attachment
          key={`${file.url}-${index}`}
          size="sm"
          className="w-[220px] max-w-full"
        >
          <AttachmentMedia className="bg-transparent">
            <FileType type={chatFileType(file)} />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{file.filename ?? file.mediaType}</AttachmentTitle>
            <AttachmentDescription>
              {chatFileType(file).toUpperCase()}
            </AttachmentDescription>
          </AttachmentContent>
          {/* A file (a menu PDF the bot sent) opens in a new tab. */}
          <AttachmentTrigger
            href={file.url}
            target="_blank"
            rel="noreferrer"
            aria-label={file.filename ?? file.mediaType}
          />
        </Attachment>
      ))}
    </div>
  );
};

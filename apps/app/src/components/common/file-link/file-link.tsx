import { clx } from "@medusajs/ui";
import { FileType, getFileType } from "@repo/ui/components/ui/file-type";
import type { FC } from "react";
import { fileNameFromUrl } from "@/utils/file-name";

interface Props {
  url: string;
  /** Shown name; the URL's last path segment when absent. */
  name?: string;
  /** Mime, for the icon when the URL has no extension. */
  mediaType?: string;
  className?: string;
}

/** A compact row that opens a file (a PDF the bot sent) in a new tab. */
export const FileLink: FC<Props> = ({ url, name, mediaType, className }) => {
  const urlName = fileNameFromUrl(url);
  const type = getFileType(
    urlName.includes(".") || !mediaType ? urlName : mediaType,
  );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={clx(
        "border-ui-border-base bg-ui-bg-base text-ui-fg-base hover:bg-ui-bg-base-hover txt-compact-small-plus inline-flex max-w-60 items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors",
        className,
      )}
    >
      <FileType type={type} size="mini" aria-hidden />
      <span className="truncate">{name || urlName}</span>
    </a>
  );
};

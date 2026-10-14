import { clx } from "@medusajs/ui";
import type { ComponentProps, CSSProperties } from "react";

// A page icon with the extension on a colored band, after ReUI's file-type.

/** Band color per extension; anything else is gray. */
const COLORS: Record<string, string> = {
  pdf: "text-orange-600",
  html: "text-orange-600",
  docx: "text-blue-600",
  jpg: "text-violet-600",
  jpeg: "text-violet-600",
  webp: "text-violet-600",
  png: "text-yellow-500 [--file-type-label:#422006]",
};

/** Mimes whose subtype is not the extension. */
const MIME_EXTENSIONS: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "text/plain": "txt",
  "text/markdown": "md",
  "image/jpeg": "jpg",
};

/** The extension of a mime type or a file name, e.g. "pdf". */
export function getFileType(mimeOrName: string): string {
  const value = mimeOrName.trim().toLowerCase();
  if (MIME_EXTENSIONS[value]) return MIME_EXTENSIONS[value];
  if (value.includes("/")) return value.split("/").pop() ?? "";
  return value.includes(".") ? (value.split(".").pop() ?? "") : value;
}

const SIZES = {
  mini: "size-[18px] [--file-type-text:5px]",
  sm: "size-8 [--file-type-text:7px]",
};

type FileTypeProps = Omit<ComponentProps<"span">, "children"> & {
  /** An extension, e.g. from `getFileType`. */
  type: string;
  size?: keyof typeof SIZES;
};

export function FileType({
  type,
  size = "sm",
  className,
  ...props
}: FileTypeProps) {
  const label = type.toUpperCase();
  return (
    <span
      role="img"
      aria-label={`${label} file`}
      data-slot="file-type"
      data-type={type}
      className={clx(
        "relative inline-block shrink-0 align-middle",
        SIZES[size],
        COLORS[type] ?? "text-zinc-500",
        className,
      )}
      {...props}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth={1.5}
        strokeLinejoin="round"
        aria-hidden="true"
        className="absolute inset-0 size-full stroke-ui-fg-muted/60"
      >
        <path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7.586a2 2 0 0 1 1.414.586l4.414 4.414A2 2 0 0 1 20 8.414V20a2 2 0 0 1-2 2Z" />
        <path d="M14 2v5a1 1 0 0 0 1 1h5" />
      </svg>
      {label && (
        // Labels past 3 letters (DOCX, WEBP) shrink to fit the band.
        <span
          style={
            { "--file-type-chars": Math.max(3, label.length) } as CSSProperties
          }
          className="absolute top-[45%] left-[5%] flex h-[35%] max-w-[95%] items-center overflow-hidden rounded-[2px] bg-current px-[7%] text-[length:calc(var(--file-type-text)*3/var(--file-type-chars))] leading-none font-semibold"
        >
          <span className="truncate text-[color:var(--file-type-label,white)]">
            {label}
          </span>
        </span>
      )}
    </span>
  );
}

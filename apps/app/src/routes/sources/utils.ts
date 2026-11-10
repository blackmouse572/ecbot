import type { TrackedLinkGetResponseDto } from "@/hooks/api/tracked-links";

type AccountType = TrackedLinkGetResponseDto["account"]["type"];

/** A source code is at most this long (the API's TRACKED_LINK_CODE_MAX_LENGTH). */
const CODE_MAX_LENGTH = 40;

/** A child code leaves room for the API's "-2" within 60. */
const CHILD_CODE_BASE_MAX_LENGTH = 57;

function slug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The code the API will make from a name ("Tờ rơi Tết" -> "to-roi-tet"),
 * for the preview before saving. Mirrors trackedLinkCodeFromName; the API
 * may add "-2" when the code is taken, and the saved link shows the final one.
 */
export function sourceCodeFromName(name: string): string {
  return slug(name).slice(0, CODE_MAX_LENGTH).replace(/-+$/, "") || "link";
}

/** A QR or KOL code under a source, as the API builds it. */
export function childCodeFromName(parentCode: string, name: string): string {
  return `${parentCode}-${sourceCodeFromName(name)}`
    .slice(0, CHILD_CODE_BASE_MAX_LENGTH)
    .replace(/-+$/, "");
}

/** A source's link with a child's code in place of its own (the code is always last). */
export function withCode(url: string, code: string, next: string): string {
  const at = url.lastIndexOf(code);

  return at < 0 ? url : url.slice(0, at) + next + url.slice(at + code.length);
}

function handleOf(link?: string): string | null {
  if (!link) return null;

  try {
    const segment = new URL(link).pathname.split("/").filter(Boolean).pop();

    return segment ? segment.replace(/^@/, "") : null;
  } catch {
    return null;
  }
}

/**
 * The link a customer will open, before the source is saved. Mirrors the
 * API's trackedLinkUrl; null when the channel cannot carry a code.
 */
export function previewSourceUrl(
  account: { type: AccountType; link?: string },
  code: string,
  targetUrl?: string,
): string | null {
  const ref = encodeURIComponent(code);
  const handle = handleOf(account.link);

  switch (account.type) {
    case "FACEBOOK_PAGE":
      return handle ? `https://m.me/${handle}?ref=${ref}` : null;
    case "INSTAGRAM_PAGE":
    case "INSTAGRAM_ACCOUNT":
      return handle ? `https://ig.me/m/${handle}?ref=${ref}` : null;
    case "TELEGRAM_BOT":
      return handle ? `https://t.me/${handle}?start=${ref}` : null;
    case "WHATSAPP_BUSINESS":
      return handle
        ? `https://wa.me/${handle}?text=${encodeURIComponent(`Xin chào shop (mã ${code})`)}`
        : null;
    case "WEBSITE_WIDGET": {
      if (!targetUrl) return null;

      try {
        const url = new URL(targetUrl);
        url.searchParams.set("ecb_src", code);

        return url.toString();
      } catch {
        return null;
      }
    }

    default:
      return null;
  }
}

/** The download name for a link's QR, e.g. "qr-to-roi-tet". */
export function qrFileName(code: string): string {
  return `qr-${code}`;
}

/** Saves a Blob as a file through a temporary link. */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** The QR as a standalone SVG file. */
export function svgBlob(svg: SVGSVGElement): Blob {
  const markup = new XMLSerializer().serializeToString(svg);

  return new Blob([markup], { type: "image/svg+xml" });
}

/** The QR drawn at `size` pixels on a white square, as a PNG. */
export async function pngBlob(svg: SVGSVGElement, size = 1024): Promise<Blob> {
  const image = new Image();
  const url = URL.createObjectURL(svgBlob(svg));

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("QR image failed to load"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Canvas is not available");
    context.drawImage(image, 0, 0, size, size);

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("PNG failed"))),
        "image/png",
      ),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

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

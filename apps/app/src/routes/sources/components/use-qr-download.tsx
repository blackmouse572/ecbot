import { toast } from "@medusajs/ui";
import { QRCodeSVG } from "qrcode.react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { pngBlob, qrFileName, saveBlob, svgBlob } from "../utils";

/**
 * PNG and SVG downloads for a link's QR, for buttons that don't show the QR
 * itself. Render `qr` somewhere in the tree: it is the hidden source image.
 */
export const useQrDownload = (url: string | null, code: string) => {
  const { t } = useTranslation();
  const ref = useRef<SVGSVGElement>(null);

  const downloadPng = async () => {
    if (!ref.current) return;

    try {
      saveBlob(await pngBlob(ref.current), `${qrFileName(code)}.png`);
    } catch (error) {
      console.error(error);
      toast.error(t("customerSources.share.downloadFailed"));
    }
  };

  const downloadSvg = () => {
    if (ref.current) saveBlob(svgBlob(ref.current), `${qrFileName(code)}.svg`);
  };

  const qr = url ? (
    <QRCodeSVG
      ref={ref}
      value={url}
      size={256}
      marginSize={2}
      aria-hidden
      className="hidden"
    />
  ) : null;

  return { qr, downloadPng, downloadSvg };
};

import { ArrowDownTray } from "@medusajs/icons";
import { Button, toast } from "@medusajs/ui";
import { QRCodeSVG } from "qrcode.react";
import { useRef, type FC } from "react";
import { useTranslation } from "react-i18next";
import { pngBlob, qrFileName, saveBlob, svgBlob } from "../utils";

type SourceQrProps = {
  url: string;
  code: string;
  name: string;
};

/** The link's QR code with PNG and SVG downloads, for print. */
export const SourceQr: FC<SourceQrProps> = ({ url, code, name }) => {
  const { t } = useTranslation();
  const ref = useRef<SVGSVGElement>(null);

  const downloadSvg = () => {
    if (ref.current) saveBlob(svgBlob(ref.current), `${qrFileName(code)}.svg`);
  };

  const downloadPng = async () => {
    if (!ref.current) return;

    try {
      saveBlob(await pngBlob(ref.current), `${qrFileName(code)}.png`);
    } catch (error) {
      console.error(error);
      toast.error(t("customerSources.share.downloadFailed"));
    }
  };

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
      {/* White in both themes, like the MFA QR: scanners need dark-on-light. */}
      <div className="rounded-lg border border-ui-border-base bg-white p-3">
        <QRCodeSVG
          ref={ref}
          value={url}
          size={136}
          marginSize={2}
          role="img"
          aria-label={t("customerSources.share.qrAlt", { name })}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="small"
          variant="secondary"
          type="button"
          onClick={downloadPng}
        >
          <ArrowDownTray />
          {t("customerSources.share.downloadPng")}
        </Button>
        <Button
          size="small"
          variant="secondary"
          type="button"
          onClick={downloadSvg}
        >
          <ArrowDownTray />
          {t("customerSources.share.downloadSvg")}
        </Button>
      </div>
    </div>
  );
};

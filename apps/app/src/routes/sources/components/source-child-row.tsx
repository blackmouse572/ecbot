import type { TrackedLinkGetResponseDto } from "@/hooks/api/tracked-links";
import {
  ArrowDownTray,
  CheckCircleSolid,
  SquareTwoStack,
} from "@medusajs/icons";
import { IconButton, Text, Tooltip, toast } from "@medusajs/ui";
import { IconLink, IconQrcode } from "@tabler/icons-react";
import { useMemo, useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { SourceCloseRate } from "./source-close-rate";
import { useQrDownload } from "./use-qr-download";

type SourceChildRowProps = {
  link: TrackedLinkGetResponseDto;
  /** The detail page's columns: the kind (Mã QR, Link KOL) and the counts. */
  showKind?: boolean;
};

/** One QR code or KOL link under a source: its name and code, copy, and QR download. */
export const SourceChildRow: FC<SourceChildRowProps> = ({ link, showKind }) => {
  const { t, i18n } = useTranslation();
  const number = useMemo(
    () => new Intl.NumberFormat(i18n.language),
    [i18n.language],
  );
  const [copied, setCopied] = useState(false);
  const { qr, downloadPng } = useQrDownload(link.url, link.code);
  const isQr = link.kind === "QR";

  const handleCopy = async () => {
    if (!link.url) return;

    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      toast.success(t("customerSources.share.copied"));
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-x-3 px-4 py-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle">
        {isQr ? (
          <IconQrcode size={14} stroke={1.5} aria-hidden />
        ) : (
          <IconLink size={14} stroke={1.5} aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <Text size="small" weight="plus" className="truncate">
          {link.name}
        </Text>
        <Text size="xsmall" className="truncate font-mono text-ui-fg-subtle">
          {link.code}
        </Text>
      </div>
      {showKind && (
        <Text
          size="small"
          className="hidden w-24 shrink-0 text-ui-fg-subtle sm:block"
        >
          {t(`customerSources.kind.${link.kind}`)}
        </Text>
      )}
      {showKind && (
        <>
          <Text
            size="small"
            className="hidden w-20 shrink-0 text-right tabular-nums md:block"
          >
            {number.format(link.stats?.newCustomers ?? 0)}
          </Text>
          <Text
            size="small"
            className="hidden w-14 shrink-0 text-right tabular-nums md:block"
          >
            {number.format(link.stats?.orders ?? 0)}
          </Text>
          <div className="hidden w-16 shrink-0 justify-end md:flex">
            <SourceCloseRate stats={link.stats} />
          </div>
        </>
      )}
      {link.url && (
        <div className="flex w-[60px] shrink-0 items-center justify-end gap-x-1">
          {isQr && (
            <Tooltip content={t("customerSources.share.downloadPng")}>
              <IconButton
                size="small"
                variant="transparent"
                type="button"
                aria-label={t("customerSources.share.downloadPng")}
                onClick={downloadPng}
              >
                <ArrowDownTray />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip content={t("customerSources.share.copy")}>
            <IconButton
              size="small"
              variant="transparent"
              type="button"
              aria-label={t("customerSources.share.copyName", {
                name: link.name,
              })}
              onClick={handleCopy}
            >
              {copied ? <CheckCircleSolid /> : <SquareTwoStack />}
            </IconButton>
          </Tooltip>
          {qr}
        </div>
      )}
    </div>
  );
};

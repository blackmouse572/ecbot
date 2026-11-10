import type { TrackedLinkGetResponseDto } from "@/hooks/api/tracked-links";
import { ArrowDownTray } from "@medusajs/icons";
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  clx,
} from "@medusajs/ui";
import { IconQrcode, IconUsers } from "@tabler/icons-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, type FC, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SourceLinkDialog, type SourceChildKind } from "./source-link-dialog";
import { SourceLinkField } from "./source-link-field";
import { useQrDownload } from "./use-qr-download";

type SourceShareStepProps = {
  link: TrackedLinkGetResponseDto;
};

/** Step 2 (frame 2b): the link with its QR, and quick ways to share it. */
export const SourceShareStep: FC<SourceShareStepProps> = ({ link }) => {
  const { t } = useTranslation();
  const [adding, setAdding] = useState<SourceChildKind | null>(null);
  const { qr, downloadPng, downloadSvg } = useQrDownload(link.url, link.code);

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-8">
      <div>
        <Heading>{t("customerSources.share.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("customerSources.share.description")}
        </Text>
      </div>

      <Container className="flex items-center gap-x-4 p-4">
        {link.url && (
          // White in both themes, like the MFA QR: scanners need dark-on-light.
          <div className="shrink-0 rounded-md border border-ui-border-base bg-white p-1.5">
            <QRCodeSVG
              value={link.url}
              size={64}
              marginSize={0}
              role="img"
              aria-label={t("customerSources.share.qrAlt", { name: link.name })}
            />
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-y-2">
          <div className="flex min-w-0 items-center gap-x-2">
            <StatusBadge color="green" className="shrink-0">
              {t("customerSources.share.created")}
            </StatusBadge>
            <Text size="small" weight="plus" className="truncate">
              {link.name}
            </Text>
          </div>
          <SourceLinkField url={link.url} channel={link.account.type} />
        </div>
      </Container>

      {link.url && (
        <div className="flex flex-col gap-y-3">
          <Heading level="h2">{t("customerSources.share.quick")}</Heading>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ShareCard
              icon={<IconQrcode size={16} stroke={1.5} />}
              title={t("customerSources.share.qrDownloadTitle")}
              hint={t("customerSources.share.qrDownloadHint")}
            >
              <div className="flex gap-x-2">
                <Button
                  size="small"
                  variant="secondary"
                  type="button"
                  onClick={downloadPng}
                >
                  <ArrowDownTray />
                  PNG
                </Button>
                <Button
                  size="small"
                  variant="secondary"
                  type="button"
                  onClick={downloadSvg}
                >
                  <ArrowDownTray />
                  SVG
                </Button>
              </div>
              {qr}
            </ShareCard>
            <ShareCard
              icon={<IconQrcode size={16} stroke={1.5} />}
              title={t("customerSources.share.qrTitle")}
              hint={t("customerSources.share.qrHint")}
              onClick={() => setAdding("QR")}
            />
            <ShareCard
              icon={<IconUsers size={16} stroke={1.5} />}
              title={t("customerSources.share.kolTitle")}
              hint={t("customerSources.share.kolHint")}
              onClick={() => setAdding("KOL")}
            />
          </div>
        </div>
      )}

      <SourceLinkDialog
        source={link}
        kind={adding}
        onClose={() => setAdding(null)}
      />
    </div>
  );
};

/** A quick-share card: a button when it has `onClick`, a panel holding its own buttons otherwise. */
const ShareCard: FC<{
  icon: ReactNode;
  title: string;
  hint: string;
  onClick?: () => void;
  children?: ReactNode;
}> = ({ icon, title, hint, onClick, children }) => {
  const body = (
    <>
      <div className="flex size-8 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle">
        {icon}
      </div>
      <div className="flex flex-col gap-y-1">
        <Text size="small" weight="plus">
          {title}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          {hint}
        </Text>
      </div>
      {children}
    </>
  );

  const className =
    "flex flex-col items-start gap-y-3 rounded-lg border border-ui-border-base bg-ui-bg-base p-4 text-left";

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={clx(
        className,
        "transition-colors hover:bg-ui-bg-base-hover focus-visible:outline-none focus-visible:shadow-borders-focus",
      )}
    >
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  );
};

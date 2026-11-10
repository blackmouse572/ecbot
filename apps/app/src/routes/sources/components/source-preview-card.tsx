import { channelOf } from "@/components/platform-icon/channel-catalog";
import { Container, Heading, Text } from "@medusajs/ui";
import type { AccountListResponseDto } from "@repo/client";
import { QRCodeSVG } from "qrcode.react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { previewSourceUrl, sourceCodeFromName } from "../utils";
import { SourceLinkField } from "./source-link-field";

type SourcePreviewCardProps = {
  account?: AccountListResponseDto;
  name: string;
  targetUrl: string;
};

/** Step 1's preview (frame 2): the link and QR the source will get, before it is saved. */
export const SourcePreviewCard: FC<SourcePreviewCardProps> = ({
  account,
  name,
  targetUrl,
}) => {
  const { t } = useTranslation();

  const url = account
    ? previewSourceUrl(account, sourceCodeFromName(name), targetUrl)
    : null;

  return (
    <Container className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-y-3">
        <div>
          <Heading level="h2">{t("customerSources.preview.title")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("customerSources.preview.description")}
          </Text>
        </div>
        {url ? (
          <>
            <SourceLinkField
              url={url}
              copyable={false}
              channel={account?.type}
            />
            <Text size="small" className="text-ui-fg-subtle">
              {t("customerSources.preview.how", {
                channel: channelOf(account!.type).label,
                account: account!.name,
                name: name.trim() || t("customerSources.preview.thisSource"),
              })}
            </Text>
          </>
        ) : (
          <Text size="small" className="text-ui-fg-muted">
            {t("customerSources.preview.empty")}
          </Text>
        )}
      </div>
      {url && (
        // White in both themes, like the MFA QR: scanners need dark-on-light.
        <div className="shrink-0 self-center rounded-lg border border-ui-border-base bg-white p-3">
          <QRCodeSVG
            value={url}
            size={136}
            marginSize={0}
            role="img"
            aria-label={t("customerSources.share.qrAlt", { name })}
          />
        </div>
      )}
    </Container>
  );
};

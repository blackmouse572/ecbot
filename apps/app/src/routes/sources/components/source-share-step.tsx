import type { TrackedLinkGetResponseDto } from "@/hooks/api/tracked-links";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { IconQrcode, IconUsers } from "@tabler/icons-react";
import { Container, Heading, StatusBadge, Text } from "@medusajs/ui";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { SourceLinkField } from "./source-link-field";
import { SourceQr } from "./source-qr";

type SourceShareStepProps = {
  link: TrackedLinkGetResponseDto;
  /** Where the source's detail page is, for the QR and KOL shortcuts. */
  detailPath: string;
};

/** Step 2: the link, its QR, and shortcuts to more codes. */
export const SourceShareStep: FC<SourceShareStepProps> = ({
  link,
  detailPath,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex w-full max-w-[720px] flex-col gap-y-8">
      <div>
        <Heading>{t("customerSources.share.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("customerSources.share.description")}
        </Text>
      </div>

      <Container className="flex flex-col gap-y-4 p-4">
        <div className="flex min-w-0 items-center gap-x-2">
          <StatusBadge color="green" className="shrink-0">
            {t("customerSources.share.created")}
          </StatusBadge>
          <PlatformIcon type={link.account.type} aria-hidden />
          <Text size="small" weight="plus" className="truncate">
            {link.name}
          </Text>
        </div>
        <SourceLinkField url={link.url} />
        {link.url && (
          <SourceQr url={link.url} code={link.code} name={link.name} />
        )}
      </Container>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Shortcut
          to={`${detailPath}/links/KOL`}
          icon={<IconUsers size={16} stroke={1.5} />}
          title={t("customerSources.share.kolTitle")}
          hint={t("customerSources.share.kolHint")}
        />
        <Shortcut
          to={`${detailPath}/links/QR`}
          icon={<IconQrcode size={16} stroke={1.5} />}
          title={t("customerSources.share.qrTitle")}
          hint={t("customerSources.share.qrHint")}
        />
      </div>
    </div>
  );
};

const Shortcut: FC<{
  to: string;
  icon: ReactNode;
  title: string;
  hint: string;
}> = ({ to, icon, title, hint }) => (
  <Link
    to={to}
    className="flex items-start gap-x-3 rounded-lg border border-ui-border-base bg-ui-bg-base p-4 transition-colors hover:bg-ui-bg-base-hover focus-visible:outline-none focus-visible:shadow-borders-focus"
  >
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-ui-border-base bg-ui-bg-subtle text-ui-fg-subtle">
      {icon}
    </div>
    <div className="min-w-0">
      <Text size="small" weight="plus">
        {title}
      </Text>
      <Text size="small" className="text-ui-fg-subtle">
        {hint}
      </Text>
    </div>
  </Link>
);

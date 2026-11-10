import type {
  TrackedLinkDetailResponseDto,
  TrackedLinkGetResponseDto,
} from "@/hooks/api/tracked-links";
import { PlusMini } from "@medusajs/icons";
import { Button, Container, Heading, Tabs, Text } from "@medusajs/ui";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { SourceLinkField } from "./source-link-field";

const TABS = ["ALL", "QR", "KOL"] as const;

type Tab = (typeof TABS)[number];

type SourceLinksSectionProps = {
  source: TrackedLinkDetailResponseDto;
};

/** The source's own QR and KOL codes, by type. */
export const SourceLinksSection: FC<SourceLinksSectionProps> = ({ source }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("ALL");

  const count = (kind: Tab) =>
    kind === "ALL"
      ? source.children.length
      : source.children.filter((child) => child.kind === kind).length;

  const shown =
    tab === "ALL"
      ? source.children
      : source.children.filter((child) => child.kind === tab);

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <div>
          <Heading level="h2">{t("customerSources.detail.links")}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("customerSources.detail.linksDescription")}
          </Text>
        </div>
        <Tabs
          value={tab}
          onValueChange={(value) =>
            setTab(TABS.find((t) => t === value) ?? "ALL")
          }
        >
          <Tabs.List>
            {(["ALL", "QR", "KOL"] as const).map((kind) => (
              <Tabs.Trigger key={kind} value={kind}>
                {kind === "ALL"
                  ? t("customerSources.detail.tabs.all")
                  : t(`customerSources.kind.${kind}`)}
                <span className="ml-1 tabular-nums text-ui-fg-muted">
                  {count(kind)}
                </span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs>
      </div>

      {shown.length === 0 ? (
        <Text size="small" className="px-6 py-4 text-ui-fg-subtle">
          {t("customerSources.detail.noLinks")}
        </Text>
      ) : (
        shown.map((child) => <LinkRow key={child.id} link={child} />)
      )}

      <div className="flex flex-wrap gap-2 px-6 py-4">
        <Button size="small" variant="secondary" asChild>
          <Link to="links/QR">
            <PlusMini />
            {t("customerSources.share.qrTitle")}
          </Link>
        </Button>
        <Button size="small" variant="secondary" asChild>
          <Link to="links/KOL">
            <PlusMini />
            {t("customerSources.share.kolTitle")}
          </Link>
        </Button>
      </div>
    </Container>
  );
};

const LinkRow: FC<{ link: TrackedLinkGetResponseDto }> = ({ link }) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 sm:w-1/3">
        <Text size="small" weight="plus" className="truncate">
          {link.name}
        </Text>
        <Text size="xsmall" className="text-ui-fg-subtle">
          {t(`customerSources.kind.${link.kind}`)}
        </Text>
      </div>
      <div className="min-w-0 flex-1">
        <SourceLinkField url={link.url} />
      </div>
    </div>
  );
};

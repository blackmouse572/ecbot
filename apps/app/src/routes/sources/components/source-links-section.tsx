import type { TrackedLinkDetailResponseDto } from "@/hooks/api/tracked-links";
import { PlusMini } from "@medusajs/icons";
import { Button, Container, Heading, Tabs, Text } from "@medusajs/ui";
import { useState, type FC } from "react";
import { useTranslation } from "react-i18next";
import { SourceChildRow } from "./source-child-row";
import { SourceLinkDialog, type SourceChildKind } from "./source-link-dialog";

const TABS = ["ALL", "QR", "KOL"] as const;

type Tab = (typeof TABS)[number];

type SourceLinksSectionProps = {
  source: TrackedLinkDetailResponseDto;
};

/** The source's own QR and KOL codes, by type (frame 11). */
export const SourceLinksSection: FC<SourceLinksSectionProps> = ({ source }) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("ALL");
  const [adding, setAdding] = useState<SourceChildKind | null>(null);

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
            setTab(TABS.find((item) => item === value) ?? "ALL")
          }
        >
          <Tabs.List>
            {TABS.map((kind) => (
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
        <div className="divide-y">
          <div className="hidden items-center gap-x-3 px-4 py-2 sm:flex">
            <Text
              size="small"
              weight="plus"
              className="flex-1 pl-10 text-ui-fg-subtle"
            >
              {t("customerSources.columns.source")}
            </Text>
            <Text
              size="small"
              weight="plus"
              className="w-24 shrink-0 text-ui-fg-subtle"
            >
              {t("customerSources.columns.kind")}
            </Text>
            <Text
              size="small"
              weight="plus"
              className="hidden w-20 shrink-0 text-right text-ui-fg-subtle md:block"
            >
              {t("customerSources.columns.newCustomers")}
            </Text>
            <Text
              size="small"
              weight="plus"
              className="hidden w-14 shrink-0 text-right text-ui-fg-subtle md:block"
            >
              {t("customerSources.columns.ordersShort")}
            </Text>
            <Text
              size="small"
              weight="plus"
              className="hidden w-16 shrink-0 text-right text-ui-fg-subtle md:block"
            >
              {t("customerSources.columns.rateShort")}
            </Text>
            <span className="w-[60px] shrink-0" />
          </div>
          {shown.map((child) => (
            <SourceChildRow key={child.id} link={child} showKind />
          ))}
        </div>
      )}

      {source.url && (
        <div className="flex flex-wrap gap-2 px-6 py-4">
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={() => setAdding("QR")}
          >
            <PlusMini />
            {t("customerSources.share.qrTitle")}
          </Button>
          <Button
            size="small"
            variant="secondary"
            type="button"
            onClick={() => setAdding("KOL")}
          >
            <PlusMini />
            {t("customerSources.share.kolTitle")}
          </Button>
        </div>
      )}

      <SourceLinkDialog
        source={source}
        kind={adding}
        onClose={() => setAdding(null)}
      />
    </Container>
  );
};

import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { channelOf } from "@/components/platform-icon/channel-catalog";
import { useCustomerTagList } from "@/hooks/api/customer-tags";
import type { TrackedLinkDetailResponseDto } from "@/hooks/api/tracked-links";
import { useDate } from "@/hooks/use-date";
import { Badge, Button, Container, Heading, Text } from "@medusajs/ui";
import { Section, SectionRow } from "@repo/ui/common-components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type SourceSettingsSectionProps = {
  source: TrackedLinkDetailResponseDto;
};

/** The source's greeting, tags and channel, beside its links (frame 11). */
export const SourceSettingsSection: FC<SourceSettingsSectionProps> = ({
  source,
}) => {
  const { t } = useTranslation();
  const { getFullDate } = useDate();
  const { tags } = useCustomerTagList();
  const sourceTags = tags.filter((tag) => source.tagIds.includes(tag.id));

  const none = (
    <Text size="small" className="text-ui-fg-muted">
      {t("customerSources.detail.none")}
    </Text>
  );

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{t("customerSources.detail.settings")}</Heading>
        <Button size="small" variant="transparent" asChild>
          <Link to="edit">{t("actions.edit")}</Link>
        </Button>
      </div>
      <Section variant="spaced">
        <SectionRow
          title={t("customerSources.form.greeting")}
          value={source.greeting ? `“${source.greeting}”` : none}
        />
        <SectionRow
          title={t("customerSources.form.tags")}
          value={
            sourceTags.length > 0 ? (
              <span className="flex flex-wrap gap-1">
                {sourceTags.map((tag) => (
                  <Badge key={tag.id} size="2xsmall">
                    {tag.emoji ? `${tag.emoji} ${tag.name}` : tag.name}
                  </Badge>
                ))}
              </span>
            ) : (
              none
            )
          }
        />
        <SectionRow
          title={t("customerSources.detail.channel")}
          value={
            <span className="flex min-w-0 items-center gap-x-2">
              <PlatformIcon type={source.account.type} aria-hidden />
              <span
                className="truncate"
                title={channelOf(source.account.type).label}
              >
                {source.account.name}
              </span>
            </span>
          }
        />
        {source.targetUrl && (
          <SectionRow
            title={t("customerSources.detail.targetUrl")}
            value={<span className="break-all">{source.targetUrl}</span>}
          />
        )}
        <SectionRow
          title={t("customerSources.detail.code")}
          value={<span className="font-mono">{source.code}</span>}
        />
        <SectionRow
          title={t("customerSources.detail.createdAt")}
          value={getFullDate(new Date(source.createdAt))}
        />
      </Section>
    </Container>
  );
};

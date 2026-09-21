import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui";
import { Section, SectionRow } from "@repo/ui/common-components";
import type { ToolResponseDto } from "@repo/client";
import { useTranslation } from "react-i18next";
import { IconFunctionFilled, IconRefresh } from "@tabler/icons-react";
import {
  useRediscoverTool,
  type ComposioToolkitDetail,
} from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";

type ToolMcpSectionProps = {
  item: ToolResponseDto;
  toolkit?: ComposioToolkitDetail;
};

type DiscoveredAction = {
  name: string;
  description?: string;
};

export const ToolMcpSection = ({ item, toolkit }: ToolMcpSectionProps) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { rediscover, isPending } = useRediscoverTool(workspaceSlug, item.id);

  const actions = (
    (item.discoveredActions ?? []) as Array<Partial<DiscoveredAction>>
  ).filter(
    (a): a is DiscoveredAction =>
      typeof a?.name === "string" && a.name.length > 0,
  );

  const handleRediscover = async () => {
    try {
      await rediscover();
    } catch {
      toast.error(t("tools.details.discover.error"));
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4 flex items-center justify-between">
        <Heading level="h2">{t("tools.details.sections.mcp")}</Heading>
        <Button
          size="small"
          variant="secondary"
          onClick={handleRediscover}
          isLoading={isPending}
          disabled={isPending}
        >
          <IconRefresh size={14} />
          {t("tools.details.fields.discoveredActionsReload")}
        </Button>
      </div>
      <Section variant="spaced">
        <SectionRow
          title={t("tools.details.fields.mcpProvider")}
          value={
            item.mcpProvider
              ? t(`tools.list.filters.providerOptions.${item.mcpProvider}`, {
                  defaultValue: item.mcpProvider,
                })
              : "-"
          }
        />
        {(item.source as Record<string, unknown> | undefined)?.toolkit && (
          <SectionRow
            title={t("tools.details.fields.composioToolkit")}
            value={String((item.source as Record<string, unknown>).toolkit)}
          />
        )}
        {toolkit && (
          <>
            <SectionRow
              title={t("tools.details.fields.toolkitDescription")}
              value={toolkit.meta.description}
            />
            {toolkit.meta.tools_count > 0 && (
              <SectionRow
                title={t("tools.details.fields.toolkitToolsCount")}
                value={String(toolkit.meta.tools_count)}
              />
            )}
            {toolkit.meta.categories.length > 0 && (
              <SectionRow
                title={t("tools.details.fields.toolkitCategories")}
                value={
                  <div className="flex flex-wrap gap-1">
                    {toolkit.meta.categories.map((c) => (
                      <Badge key={c.slug} size="2xsmall">
                        {c.name}
                      </Badge>
                    ))}
                  </div>
                }
              />
            )}
          </>
        )}
      </Section>
      <div className="px-6 py-4 flex flex-col gap-3">
        <Text weight="plus" size="small">
          <IconFunctionFilled className="text-ui-fg-muted inline-block size-4 mr-1" />

          {t("tools.details.fields.discoveredActions")}
        </Text>
        {actions.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.details.fields.discoveredActionsEmpty")}
          </Text>
        ) : (
          <ul className="flex flex-col gap-3">
            {actions.map((action) => (
              <li
                key={action.name}
                className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4"
              >
                <Text
                  size="small"
                  className="text-ui-fg-base font-medium truncate"
                  title={action.name}
                >
                  {action.name}
                </Text>
                <Text size="small" className="text-ui-fg-subtle">
                  {action.description ?? ""}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
};

import { useSkillUsage } from "@/hooks/api/skills";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ExclamationCircle } from "@medusajs/icons";
import { Badge, Container, Heading, StatusBadge, Text } from "@medusajs/ui";
import type { SkillGetResponseDto } from "@repo/client";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../constants";
import { toolLabelOf } from "../../utils";

type Props = { skill: SkillGetResponseDto };

// Read-only lists, laid out like the chatbot detail's tools tab: the
// chatbots this skill is attached to (Used by) and the tools its steps call
// (Uses), with a warning when a chatbot cannot call one.
export const SkillUsageSection = ({ skill }: Props) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const { usage, isLoading } = useSkillUsage(workspaceSlug, skill.id, {
    enabled: !skill.isBuiltin,
  });
  const toolLabel = toolLabelOf(usage?.tools);

  if (skill.isBuiltin || isLoading || !usage) return null;

  return (
    <>
      <Container className="divide-y p-0">
        <SectionHeader
          title={t("skills.usage.usedBy")}
          count={usage.chatbots.length}
        />
        {usage.chatbots.length === 0 ? (
          <Text size="small" className="px-6 py-4 text-ui-fg-subtle">
            {t("skills.usage.notAttached")}
          </Text>
        ) : (
          usage.chatbots.map((bot) => (
            <Row
              key={bot.id}
              to={`/${workspaceSlug}/${ROUTES.Chatbot}/${bot.id}`}
              name={bot.name}
              end={
                <StatusBadge color={bot.enabled ? "green" : "grey"}>
                  {t(
                    bot.enabled
                      ? "skills.status.active"
                      : "skills.status.inactive",
                  )}
                </StatusBadge>
              }
            >
              {bot.missingTools.map((m) => (
                <Text
                  key={`${m.id}:${m.action ?? ""}`}
                  size="small"
                  className="flex items-center gap-x-1 text-ui-fg-subtle"
                >
                  <ExclamationCircle className="shrink-0 text-ui-tag-orange-icon" />
                  {t("skills.usage.missingTool", {
                    tool:
                      toolLabel({ toolId: m.id, action: m.action }) ||
                      t("skills.steps.unknownTool"),
                  })}
                </Text>
              ))}
            </Row>
          ))
        )}
      </Container>
      {usage.tools.length > 0 && (
        <Container className="divide-y p-0">
          <SectionHeader
            title={t("skills.usage.uses")}
            count={usage.tools.length}
          />
          {usage.tools.map((tool) => (
            <Row
              key={`${tool.id}:${tool.action ?? ""}`}
              to={`/${workspaceSlug}/${ROUTES.Tools}/${tool.id}`}
              name={tool.name}
              start={
                <Badge
                  size="2xsmall"
                  color={tool.kind === "MCP" ? "purple" : "blue"}
                >
                  {tool.kind}
                </Badge>
              }
            >
              {tool.action && (
                <Text size="small" className="truncate text-ui-fg-subtle">
                  {tool.action}
                </Text>
              )}
            </Row>
          ))}
        </Container>
      )}
    </>
  );
};

const SectionHeader = ({ title, count }: { title: string; count: number }) => (
  <div className="flex items-center gap-x-1.5 px-6 py-4">
    <Heading level="h2">{title}</Heading>
    <Text className="tabular-nums text-ui-fg-muted">{count}</Text>
  </div>
);

const Row = ({
  to,
  name,
  start,
  end,
  children,
}: {
  to: string;
  name: string;
  start?: ReactNode;
  end?: ReactNode;
  children?: ReactNode;
}) => (
  <div className="flex items-center gap-3 px-6 py-4">
    {start}
    <div className="min-w-0 flex-1">
      <Link to={to} className="hover:underline">
        <Text weight="plus" className="truncate">
          {name}
        </Text>
      </Link>
      {children}
    </div>
    {end}
  </div>
);

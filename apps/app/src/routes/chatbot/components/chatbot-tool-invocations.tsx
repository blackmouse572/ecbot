import {
  useListTools,
  useToolInvocations,
  type ToolInvocationResponseDto,
} from "@/hooks/api/tools";
import {
  Badge,
  Button,
  Container,
  Heading,
  IconButton,
  Text,
} from "@medusajs/ui";
import { Accordion } from "@repo/ui/components";
import { ChevronDown } from "@medusajs/icons";
import { IconRefresh } from "@tabler/icons-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

type ChatbotToolInvocationsProps = {
  chatbotId: string;
  workspace: string;
};

/**
 * Recent invocations panel. Reads the last 100 ToolInvocation rows for the
 * chatbot and renders them with expand-row JSON for input/output. Operators
 * use this to debug tool calls that customers report as failing.
 */
export function ChatbotToolInvocations({
  chatbotId,
  workspace,
}: ChatbotToolInvocationsProps) {
  const { t } = useTranslation();
  const { tools } = useListTools(workspace);
  const { invocations, isLoading, refetch, isFetching } = useToolInvocations(
    workspace,
    chatbotId,
  );

  const toolNameById = useMemo(() => {
    const map = new Map<string, string>();
    (tools ?? []).forEach((tool) => map.set(tool.id, tool.name));
    return map;
  }, [tools]);

  return (
    <Container className="p-0">
      <div className="px-6 py-4 border-b flex items-center justify-between gap-4">
        <div className="min-w-0">
          <Heading level="h3" className="text-lg font-semibold">
            {t("tools.invocations.title")}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.invocations.subtitle")}
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          onClick={() => refetch()}
          isLoading={isFetching}
          className="whitespace-nowrap shrink-0"
        >
          <IconRefresh size={14} />
          {t("tools.invocations.refresh")}
        </Button>
      </div>

      {isLoading ? (
        <div className="px-6 py-10 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.list.loading")}
          </Text>
        </div>
      ) : invocations.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <Text size="small" className="text-ui-fg-subtle">
            {t("tools.invocations.empty")}
          </Text>
        </div>
      ) : (
        <div className="max-h-[480px] overflow-y-auto divide-y">
          {invocations.map((inv) => (
            <InvocationRow
              key={inv.id}
              invocation={inv}
              toolName={toolNameById.get(inv.toolId)}
            />
          ))}
        </div>
      )}
    </Container>
  );
}

type InvocationRowProps = {
  invocation: ToolInvocationResponseDto;
  toolName?: string;
};

function InvocationRow({ invocation, toolName }: InvocationRowProps) {
  const { t } = useTranslation();

  const statusColor = useMemo(() => {
    switch (invocation.status) {
      case "SUCCESS":
        return "green" as const;
      case "ERROR":
        return "red" as const;
      case "TIMEOUT":
        return "orange" as const;
      default:
        return "grey" as const;
    }
  }, [invocation.status]);

  const timestamp = useMemo(() => {
    try {
      return new Date(invocation.createdAt).toLocaleString();
    } catch {
      return String(invocation.createdAt);
    }
  }, [invocation.createdAt]);

  const rowContent = (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <Badge size="2xsmall" color={statusColor}>
        {invocation.status}
      </Badge>
      <div className="min-w-0">
        <Text size="small" weight="plus" className="truncate">
          {toolName ?? invocation.toolId}
          {invocation.actionName ? ` · ${invocation.actionName}` : ""}
        </Text>
        <Text size="xsmall" className="text-ui-fg-subtle truncate">
          {timestamp} · {invocation.durationMs}ms
        </Text>
      </div>
    </div>
  );

  return (
    <Accordion type="single" collapsible>
      <Accordion.Item value={invocation.id} className="border-b-0">
        <Accordion.Header
          className="py-4"
          trigger={
            <IconButton variant="transparent">
              <ChevronDown className="transform transition-transform group-data-[state=open]:rotate-180" />
            </IconButton>
          }
        >
          {rowContent}
        </Accordion.Header>
        <Accordion.Content className="!pl-6 !pr-6 pb-4">
          <div className="space-y-3">
            <InvocationJsonBlock
              label={t("tools.invocations.input")}
              value={invocation.inputArgs}
            />
            {invocation.outputResult !== undefined && (
              <InvocationJsonBlock
                label={t("tools.invocations.output")}
                value={invocation.outputResult}
              />
            )}
            {invocation.errorMessage && (
              <div>
                <Text size="xsmall" weight="plus" className="text-ui-fg-error">
                  {t("tools.invocations.error")}
                </Text>
                <pre className="mt-1 p-2 rounded-md bg-ui-bg-subtle text-xs overflow-auto max-h-40">
                  {invocation.errorMessage}
                </pre>
              </div>
            )}
            <Text size="xsmall" className="text-ui-fg-muted">
              correlationId: {invocation.correlationId}
            </Text>
          </div>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

function InvocationJsonBlock({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  const json = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <div>
      <Text size="xsmall" weight="plus">
        {label}
      </Text>
      <pre className="mt-1 p-2 rounded-md bg-ui-bg-subtle text-xs overflow-auto max-h-60">
        {json}
      </pre>
    </div>
  );
}

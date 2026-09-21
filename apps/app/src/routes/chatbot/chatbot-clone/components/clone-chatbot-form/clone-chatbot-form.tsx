import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import { useChatbotKnowledgeItems, useCloneChatbot } from "@/hooks/api";
import { useRagList } from "@/hooks/api/rag";
import { useListChatbotTools } from "@/hooks/api/tools";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Badge,
  Button,
  Checkbox,
  Heading,
  Input,
  Text,
  toast,
  Tooltip,
} from "@medusajs/ui";
import type { CloneChatbotRequestDto } from "@repo/client";
import { Form } from "@repo/ui/common-components";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  cloneChatbotSchema,
  type CloneChatbotFormData,
} from "../../../schemas";

type CloneChatbotFormProps = {
  chatbotId: string;
  sourceName: string;
};

type CloneOption = "cloneTools" | "cloneKnowledgeItems" | "cloneRags";

const CLONE_OPTIONS: CloneOption[] = [
  "cloneTools",
  "cloneKnowledgeItems",
  "cloneRags",
];

const TOOLTIP_LIMIT = 5;

export function CloneChatbotForm({
  chatbotId,
  sourceName,
}: CloneChatbotFormProps) {
  const { t } = useTranslation();
  const { handleSuccess } = useRouteModal();
  const { workspaceSlug } = useWorkspaceParams();
  const { mutateAsync: cloneChatbot, isPending } = useCloneChatbot(chatbotId);

  const { tools } = useListChatbotTools(workspaceSlug, chatbotId);
  const { items: knowledgeItems, count: knowledgeCount } =
    useChatbotKnowledgeItems(chatbotId);
  const { rags, totals: ragCount } = useRagList({}, workspaceSlug, chatbotId);

  const optionData: Record<CloneOption, { count: number; names: string[] }> = {
    cloneTools: {
      count: tools.length,
      names: tools.map((tool) => tool.name),
    },
    cloneKnowledgeItems: {
      count: knowledgeCount,
      names: (knowledgeItems ?? []).map((item) => item.knowledgeItem.title),
    },
    cloneRags: {
      count: ragCount,
      names: (rags ?? []).map(
        (rag) => rag.attachment.key.split("/").pop() ?? rag.attachment.key,
      ),
    },
  };

  const form = useForm<CloneChatbotFormData>({
    resolver: zodResolver(cloneChatbotSchema),
    defaultValues: {
      name: `${sourceName} (Copy)`,
      cloneTools: true,
      cloneKnowledgeItems: true,
      cloneRags: true,
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    try {
      await cloneChatbot(data as CloneChatbotRequestDto);
      toast.success(t("chatbot.clone.success", { name: data.name }));
      handleSuccess();
    } catch (error) {
      console.error("Failed to clone chatbot:", error);
      toast.error(t("chatbot.clone.error"));
    }
  });

  return (
    <RouteFocusModal.Form form={form}>
      <KeyboundForm onSubmit={handleSubmit} className="flex h-full flex-col">
        <RouteFocusModal.Header />
        <RouteFocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto p-16">
          <div className="flex w-full max-w-[720px] flex-col gap-y-8">
            <Heading>{t("chatbot.clone.title")}</Heading>

            <Form.Field
              name="name"
              control={form.control}
              render={({ field }) => (
                <Form.Item>
                  <Form.Label>{t("fields.name")}</Form.Label>
                  <Form.Control>
                    <Input {...field} />
                  </Form.Control>
                  <Form.ErrorMessage />
                </Form.Item>
              )}
            />

            <div className="flex flex-col gap-y-2">
              <Text size="small" weight="plus" className="text-ui-fg-subtle">
                {t("chatbot.clone.optionsLabel")}
              </Text>
              {CLONE_OPTIONS.map((option) => (
                <Form.Field
                  key={option}
                  name={option}
                  control={form.control}
                  render={({ field }) => (
                    <Form.Item className="flex-row items-center gap-x-2">
                      <Form.Control>
                        <Checkbox
                          {...field}
                          value={field.value.toString()}
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mb-0"
                        />
                      </Form.Control>
                      <Form.Label className="space-x-2">
                        <span>{t(`chatbot.clone.${option}`)}</span>
                        <CloneOptionCount {...optionData[option]} />
                      </Form.Label>
                    </Form.Item>
                  )}
                />
              ))}
            </div>
          </div>
        </RouteFocusModal.Body>
        <RouteFocusModal.Footer>
          <div className="flex items-center justify-end gap-x-2">
            <RouteFocusModal.Close asChild>
              <Button type="button" variant="secondary" size="small">
                {t("actions.cancel")}
              </Button>
            </RouteFocusModal.Close>
            <Button type="submit" size="small" isLoading={isPending}>
              {t("chatbot.clone.confirm")}
            </Button>
          </div>
        </RouteFocusModal.Footer>
      </KeyboundForm>
    </RouteFocusModal.Form>
  );
}

function CloneOptionCount({
  count,
  names,
}: {
  count: number;
  names: string[];
}) {
  const { t } = useTranslation();

  if (count === 0) {
    return <Badge size="2xsmall">0</Badge>;
  }

  return (
    <Tooltip
      content={
        <ul className="flex flex-col gap-y-0.5 ml-2 list-disc">
          {names.slice(0, TOOLTIP_LIMIT).map((name, index) => (
            <li key={`${name}-${index}`}>{name}</li>
          ))}
          {count > TOOLTIP_LIMIT && (
            <li className="text-ui-fg-muted">
              {t("chatbot.clone.more", { count: count - TOOLTIP_LIMIT })}
            </li>
          )}
        </ul>
      }
    >
      <Badge size="2xsmall" className="cursor-help">
        {count}
      </Badge>
    </Tooltip>
  );
}

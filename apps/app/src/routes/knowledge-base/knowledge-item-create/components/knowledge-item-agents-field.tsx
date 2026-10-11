import { useChatbots } from "@/hooks/api";
import { Checkbox, Label, Text } from "@medusajs/ui";
import { Form } from "@repo/ui/common-components";
import type { FC } from "react";
import type { Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { KnowledgeItemCreateFormValues } from "./schema";

interface KnowledgeItemAgentsFieldProps {
  control: Control<KnowledgeItemCreateFormValues>;
}

/** Picks the agents the new item is linked to once it is created. */
export const KnowledgeItemAgentsField: FC<KnowledgeItemAgentsFieldProps> = ({
  control,
}) => {
  const { t } = useTranslation();
  const { chatbots, isLoading, isError } = useChatbots({ perPage: 100 });
  // An archived agent answers no one, so linking to it would do nothing.
  const agents = (chatbots ?? []).filter((c) => c.status !== "archived");

  return (
    <Form.Field
      control={control}
      name="chatbotIds"
      render={({ field }) => {
        const selected = field.value ?? [];
        const toggle = (id: string, checked: boolean) =>
          field.onChange(
            checked ? [...selected, id] : selected.filter((v) => v !== id),
          );

        return (
          <Form.Item>
            {/* A checklist, so a fieldset names the group for screen readers. */}
            <fieldset className="flex flex-col gap-y-2">
              <legend className="flex items-center gap-x-1">
                <Text size="small" weight="plus" leading="compact">
                  {t("knowledge_item.agents_label")}
                </Text>
                <Text
                  size="small"
                  leading="compact"
                  className="text-ui-fg-muted"
                >
                  ({t("fields.optional")})
                </Text>
              </legend>
              <Text size="small" className="text-ui-fg-subtle">
                {t("knowledge_item.agents_hint")}
              </Text>
              {isLoading ? (
                <Text size="small" className="text-ui-fg-subtle">
                  {t("knowledge_item.agents_loading")}
                </Text>
              ) : isError ? (
                <Text size="small" className="text-ui-fg-subtle">
                  {t("knowledge_item.agents_error")}
                </Text>
              ) : !agents.length ? (
                <Text size="small" className="text-ui-fg-subtle">
                  {t("knowledge_item.agents_empty")}
                </Text>
              ) : (
                <ul className="flex flex-col gap-y-2">
                  {agents.map((chatbot) => {
                    const id = `kb-item-agent-${chatbot.id}`;
                    return (
                      <li
                        key={chatbot.id}
                        className="flex items-center gap-x-2"
                      >
                        <Checkbox
                          id={id}
                          checked={selected.includes(chatbot.id)}
                          onCheckedChange={(v) =>
                            toggle(chatbot.id, v === true)
                          }
                        />
                        <Label htmlFor={id} size="small">
                          {chatbot.name}
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </fieldset>
          </Form.Item>
        );
      }}
    />
  );
};

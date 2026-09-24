import { TEMPLATE_TYPES, type BusinessTypeId } from "@repo/agent-blueprint";
import { Button, Text } from "@medusajs/ui";
import {
  Marker, MarkerContent, Message, MessageContent, PromptInput, PromptInputBody,
  PromptInputFooter, PromptInputSubmit, PromptInputTextarea,
} from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";

type Props = { loading: boolean; onDescribe: (text: string) => void; onTemplate: (type: BusinessTypeId) => void };

export function StartComposer({ loading, onDescribe, onTemplate }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4 p-4 md:p-8">
      <Message from="assistant">
        <MessageContent>{t("agentBuilder.ui.startMessage")}</MessageContent>
      </Message>
      <PromptInput
        onSubmit={({ text }) => {
          if (text.trim() && !loading) onDescribe(text.trim());
        }}
      >
        <PromptInputBody>
          <PromptInputTextarea placeholder={t("agentBuilder.ui.startPlaceholder")} maxLength={1000} disabled={loading} />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputSubmit className="ml-auto" status={loading ? "submitted" : "idle"} disabled={loading} />
        </PromptInputFooter>
      </PromptInput>
      {loading && (
        <Marker>
          <MarkerContent>{t("agentBuilder.ui.suggesting")}</MarkerContent>
        </Marker>
      )}
      <Text size="small" className="text-ui-fg-subtle">{t("agentBuilder.ui.templates")}</Text>
      <div className="flex flex-wrap gap-2">
        {TEMPLATE_TYPES.map((type) => (
          <Button key={type} size="small" variant="secondary" disabled={loading} onClick={() => onTemplate(type)}>
            {t(`agentBuilder.types.${type}`)}
          </Button>
        ))}
      </div>
    </div>
  );
}

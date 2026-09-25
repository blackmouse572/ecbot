import { BuildingLoader } from "@/components/ai-chat/ai-loader";
import { TEMPLATE_TYPES, type BusinessTypeId } from "@repo/agent-blueprint";
import {
  Message, MessageContent, PromptInput, PromptInputBody, PromptInputFooter, PromptInputSubmit,
  PromptInputTextarea, Questionnaire, QuestionnaireChoice, QuestionnaireChoices, QuestionnaireItem,
  QuestionnaireTitle,
} from "@repo/ui/common-components";
import { clx, Text } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { businessTypeIcon } from "./business-type-icon";

type Props = { loading: boolean; onDescribe: (text: string) => void; onTemplate: (type: BusinessTypeId) => void };

/**
 * Step 0: describe the business or pick a template. Styled like a
 * `QuestionMessage` card (section E) so it reads as part of the same thread
 * instead of a one-off intro screen, and remains reachable to go back to
 * (see `builder-thread.tsx`'s step-0 pair + `restart`).
 */
export function Step0Card({ loading, onDescribe, onTemplate }: Props) {
  const { t } = useTranslation();
  return (
    <Message from="assistant" variant="outline" className="w-full">
      <MessageContent className="w-full max-w-full">
        <div className="flex flex-col gap-4">
          <Text size="small">{t("agentBuilder.ui.startMessage")}</Text>
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
          {loading && <BuildingLoader state={t("agentBuilder.ui.suggesting")} />}
          <Questionnaire onSubmit={() => {}}>
            <QuestionnaireItem name="template" value="" onValueChange={(v) => onTemplate(v as BusinessTypeId)}>
              <QuestionnaireTitle>{t("agentBuilder.ui.templates")}</QuestionnaireTitle>
              <div className={clx(loading && "pointer-events-none opacity-60")}>
                <QuestionnaireChoices>
                  {TEMPLATE_TYPES.map((type) => (
                    <QuestionnaireChoice key={type} value={type} label={t(`agentBuilder.types.${type}`)} icon={businessTypeIcon(type)} />
                  ))}
                </QuestionnaireChoices>
              </div>
            </QuestionnaireItem>
          </Questionnaire>
        </div>
      </MessageContent>
    </Message>
  );
}

import { buildQuestionGroups } from "@repo/agent-blueprint";
import { Button } from "@medusajs/ui";
import {
  Marker, MarkerContent, Message, MessageContent, MessageScroller, MessageScrollerButton,
  MessageScrollerContent, MessageScrollerItem, MessageScrollerViewport,
} from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import { currentStep, isComplete, steps } from "../builder-state";
import type { AgentBuilderController } from "../use-agent-builder";
import { AnswerMessage } from "./answer-message";
import { QuestionMessage } from "./question-message";
import { StartComposer } from "./start-composer";

export function BuilderThread(builder: AgentBuilderController) {
  const { t } = useTranslation();
  const { state, dispatch } = builder;

  if (!state.profile) {
    return <StartComposer loading={builder.starting} onDescribe={builder.startFromDescription} onTemplate={builder.startFromTemplate} />;
  }

  const profile = state.profile;
  const all = steps(profile);
  const current = currentStep(state);
  const complete = isComplete(state);

  return (
    <MessageScroller className="h-full">
      <MessageScrollerViewport>
        <MessageScrollerContent className="mx-auto flex w-full max-w-[680px] flex-col gap-4 p-4 pb-24 md:p-8">
          {state.source === "describe" && (
            <Message from="assistant">
              <MessageContent>{t(state.suggestion ? "agentBuilder.ui.suggested" : "agentBuilder.ui.suggestFailed")}</MessageContent>
            </Message>
          )}

          {buildQuestionGroups(profile).map((group) => {
            const visible = group.questions.filter(
              (q) => state.answered.includes(q.id) || q.id === current?.question.id,
            );
            if (!visible.length) return null;
            return (
              <div key={group.id} className="flex flex-col gap-4">
                <Marker variant="separator">
                  <MarkerContent>{t(group.titleKey)}</MarkerContent>
                </Marker>
                {visible.map((question) =>
                  question.id === current?.question.id ? (
                    <MessageScrollerItem key={question.id} messageId={question.id} scrollAnchor>
                      <QuestionMessage
                        key={`${question.id}:${state.editing ?? ""}`}
                        question={question}
                        profile={profile}
                        suggestion={state.suggestion}
                        position={{ current: all.findIndex((s) => s.question.id === question.id) + 1, total: all.length }}
                        onAnswer={(value) => dispatch({ type: "answer", question, value })}
                        onSkip={() => dispatch({ type: "skip", question })}
                      />
                    </MessageScrollerItem>
                  ) : (
                    <AnswerMessage
                      key={question.id}
                      question={question}
                      profile={profile}
                      onEdit={() => dispatch({ type: "edit", questionId: question.id })}
                    />
                  ),
                )}
                {group.id === "rules" && state.chatbotId && state.source !== "hydrate" && (
                  <Message from="assistant">
                    <MessageContent>{t("agentBuilder.ui.draftCreated")}</MessageContent>
                  </Message>
                )}
              </div>
            );
          })}

          {builder.saveError && (
            <Marker className="text-ui-fg-error">
              <MarkerContent>{t("agentBuilder.ui.saveFailed")}</MarkerContent>
            </Marker>
          )}

          {complete && !state.finished && (
            <Message from="assistant">
              <MessageContent className="flex flex-col items-start gap-3">
                {t("agentBuilder.ui.done")}
                <Button size="small" onClick={builder.finish} isLoading={builder.finishing} disabled={!state.chatbotId}>
                  {t("agentBuilder.ui.finish")}
                </Button>
              </MessageContent>
            </Message>
          )}
          {state.finished && (
            <Message from="assistant">
              <MessageContent>{t("agentBuilder.ui.finished")}</MessageContent>
            </Message>
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  );
}

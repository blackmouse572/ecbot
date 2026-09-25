import { buildQuestionGroups } from "@repo/agent-blueprint";
import { Button, clx } from "@medusajs/ui";
import {
  Marker, MarkerContent, Message, MessageContent, MessageScroller, MessageScrollerButton,
  MessageScrollerContent, MessageScrollerItem, MessageScrollerViewport,
} from "@repo/ui/common-components";
import { motion, useReducedMotion } from "motion/react";
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { currentStep, isComplete, steps } from "../builder-state";
import type { AgentBuilderController } from "../use-agent-builder";
import { AnswerMessage } from "./answer-message";
import { ChannelsAnswer } from "./channels-answer";
import { Hero } from "./hero";
import { QuestionTurn } from "./question-turn";

// Section F.1: the current question's entrance. No exit animation, and
// input is never blocked by it.
const QUESTION_ENTRANCE = clx(
  "transition-[opacity,transform] duration-[180ms] ease-out",
  "starting:opacity-0 starting:translate-y-1.5",
  "motion-reduce:starting:translate-y-0",
);

export function BuilderThread(builder: AgentBuilderController) {
  const { t } = useTranslation();
  const { state, dispatch } = builder;
  const reduceMotion = useReducedMotion();

  const profile = state.profile;

  // Wireframe delta section 1: step 0 is a centered hero, not part of the
  // thread, while there is no profile yet.
  if (!profile) {
    return <Hero loading={builder.starting} onDescribe={builder.startFromDescription} onTemplate={builder.startFromTemplate} />;
  }

  const all = steps(profile);
  const current = currentStep(state);
  const complete = isComplete(state);

  // Section E (kept by the wireframe delta): step 0's answer, once a
  // description or template was chosen.
  const step0Answer =
    state.source === "template" ? t("agentBuilder.ui.templateAnswer", { name: t(`agentBuilder.types.${profile.businessType}`) })
    : state.source === "describe" ? (state.describeText ?? "")
    : null; // hydrate: no original step-0 choice to redisplay.

  return (
    <MessageScroller className="h-full">
      <MessageScrollerViewport>
        <MessageScrollerContent className="mx-auto flex w-full max-w-[680px] flex-col gap-4 p-4 pb-24 md:p-8">
          {step0Answer !== null && (
            <div className="flex flex-col gap-4">
              <Message from="assistant">
                <MessageContent>{t("agentBuilder.ui.heroSubtitle")}</MessageContent>
              </Message>
              <Message from="user">
                <MessageContent
                  render={<button type="button" onClick={() => dispatch({ type: "restart" })} title={t("actions.edit")} className="text-left" />}
                >
                  {step0Answer}
                </MessageContent>
              </Message>
            </div>
          )}

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
                {visible.map((question) => (
                  <Fragment key={question.id}>
                    {question.id === current?.question.id ? (
                      <MessageScrollerItem messageId={question.id} scrollAnchor className={clx("flex flex-col gap-4", QUESTION_ENTRANCE)}>
                        <QuestionTurn
                          key={`${question.id}:${state.editing ?? ""}`}
                          question={question}
                          profile={profile}
                          suggestion={state.suggestion}
                          position={{ current: all.findIndex((s) => s.question.id === question.id) + 1, total: all.length }}
                          onAnswer={(value) => dispatch({ type: "answer", question, value })}
                          onSkip={() => dispatch({ type: "skip", question })}
                          chatbotId={state.chatbotId}
                          linkedAccounts={state.linkedAccounts}
                          onAccountsLinked={(accounts) => dispatch({ type: "accountsLinked", accounts })}
                          onAccountsUnlinked={(ids) => dispatch({ type: "accountsUnlinked", ids })}
                        />
                      </MessageScrollerItem>
                    ) : (
                      // Section D: the question asked, then the answer given.
                      <div className="flex flex-col gap-4">
                        <Message from="assistant">
                          <MessageContent>{t(question.askKey)}</MessageContent>
                        </Message>
                        {question.id === "channels" && state.chatbotId ? (
                          <ChannelsAnswer
                            question={question}
                            linkedAccounts={state.linkedAccounts}
                            channels={profile.channels}
                            onEdit={() => dispatch({ type: "edit", questionId: question.id })}
                          />
                        ) : (
                          <AnswerMessage question={question} profile={profile} onEdit={() => dispatch({ type: "edit", questionId: question.id })} />
                        )}
                      </div>
                    )}
                    {/* Batch 3: the draft-created message moves to right
                        after the agent-name answer (step 3, when the draft
                        is actually created). */}
                    {question.id === "agentName" && state.chatbotId && state.source !== "hydrate" && (
                      <Message from="assistant">
                        <MessageContent>{t("agentBuilder.ui.draftCreated")}</MessageContent>
                      </Message>
                    )}
                  </Fragment>
                ))}
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
            // Section F.4: plays once when the agent becomes active.
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0.2, ease: [0.23, 1, 0.32, 1] }
                  : { type: "spring", duration: 0.5, bounce: 0.2 }
              }
              style={{ transformOrigin: "left bottom" }}
            >
              <Message from="assistant">
                <MessageContent>{t("agentBuilder.ui.finished")}</MessageContent>
              </Message>
            </motion.div>
          )}
        </MessageScrollerContent>
      </MessageScrollerViewport>
      <MessageScrollerButton />
    </MessageScroller>
  );
}

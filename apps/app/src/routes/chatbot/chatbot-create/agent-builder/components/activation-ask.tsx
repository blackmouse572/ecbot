import { Button, Text } from "@medusajs/ui";
import {
  buildQuestionGroups,
  readAnswer,
  summarizeAnswer,
} from "@repo/agent-blueprint";
import { Message, MessageContent } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import type { AgentBuilderController } from "../use-agent-builder";

// The defaults that change how replies read, shown before the agent goes
// live since the builder no longer asks them (agent v2).
const SHOWN_DEFAULTS = [
  "addressStyle",
  "replyLength",
  "handoffWhen",
  "afterHours",
];

/**
 * Asked once every question is answered: says which defaults the agent
 * uses, then turns it on now or later. The answer stays in the thread.
 */
export function ActivationAsk({
  state,
  dispatch,
  finish,
  finishing,
}: AgentBuilderController) {
  const { t } = useTranslation();
  const decided = state.finished || state.activateLater;
  const profile = state.profile;
  const defaults = profile
    ? buildQuestionGroups(profile)
        .flatMap((group) => group.questions)
        .filter((question) => SHOWN_DEFAULTS.includes(question.id))
        .sort(
          (a, b) => SHOWN_DEFAULTS.indexOf(a.id) - SHOWN_DEFAULTS.indexOf(b.id),
        )
        .map((question) => ({
          id: question.id,
          value: summarizeAnswer(
            question,
            readAnswer(profile, question.path),
            t,
          ),
        }))
        .filter((item) => item.value)
    : [];

  return (
    <div className="flex flex-col gap-4">
      {defaults.length > 0 && (
        <Message from="assistant">
          <MessageContent className="flex flex-col items-start gap-3">
            {t("agentBuilder.ui.defaultsIntro")}
            <ul className="flex flex-col gap-1">
              {defaults.map(({ id, value }) => (
                <li key={id}>
                  <Text size="small" leading="compact">
                    <span className="text-ui-fg-subtle">
                      {t(`agentBuilder.ui.defaults.${id}`)}:
                    </span>{" "}
                    {value}
                  </Text>
                </li>
              ))}
            </ul>
          </MessageContent>
        </Message>
      )}
      <Message from="assistant">
        <MessageContent className="flex flex-col items-start gap-3">
          {t("agentBuilder.ui.activateAsk")}
          {!decided && (
            <div className="flex gap-2">
              <Button size="small" onClick={finish} isLoading={finishing}>
                {t("agentBuilder.ui.activateNow")}
              </Button>
              <Button
                size="small"
                variant="secondary"
                disabled={finishing}
                onClick={() => dispatch({ type: "activateLater" })}
              >
                {t("agentBuilder.ui.activateLater")}
              </Button>
            </div>
          )}
        </MessageContent>
      </Message>
      {decided && (
        <Message from="user">
          <MessageContent>
            {t(
              state.activateLater
                ? "agentBuilder.ui.activateLater"
                : "agentBuilder.ui.activateNow",
            )}
          </MessageContent>
        </Message>
      )}
    </div>
  );
}

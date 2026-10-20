import { Button } from "@medusajs/ui";
import { Message, MessageContent } from "@repo/ui/common-components";
import { useTranslation } from "react-i18next";
import type { AgentBuilderController } from "../use-agent-builder";

/**
 * Asked once every basic question is answered (#256): turn the agent on now,
 * or keep answering and activate at the end. The answer stays in the thread.
 */
export function ActivationAsk({
  state,
  dispatch,
  finish,
  finishing,
}: AgentBuilderController) {
  const { t } = useTranslation();
  const decided = state.finished || state.activateLater;
  return (
    <div className="flex flex-col gap-4">
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

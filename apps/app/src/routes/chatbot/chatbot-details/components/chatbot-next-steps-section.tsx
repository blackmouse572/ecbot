import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { BookOpen, ChatBubbleLeftRight, Channels } from "@medusajs/icons";
import { Container, Heading, Text } from "@medusajs/ui";
import type { ChatbotGetDetailResponseDto } from "@repo/client";
import type { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CHATBOT_EDIT_SECTIONS } from "../../constants";

type Props = {
  item: Pick<ChatbotGetDetailResponseDto, "accounts" | "welcomeMessage">;
  /** Knowledge items linked to the agent; undefined while loading. */
  knowledgeCount?: number;
  onOpenKnowledge: () => void;
};

const ROW =
  "hover:bg-ui-bg-base-hover flex w-full items-start gap-x-3 px-6 py-4 text-left transition-colors";

/**
 * What would make this agent answer better, as rows like the dashboard's
 * getting-started checklist. Only undone steps show; with none, no card.
 */
export const ChatbotNextStepsSection: FC<Props> = ({
  item,
  knowledgeCount,
  onOpenKnowledge,
}) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  const content = (key: string, icon: ReactNode) => (
    <>
      <span
        aria-hidden
        className="bg-ui-bg-component text-ui-fg-subtle shadow-borders-base flex size-8 shrink-0 items-center justify-center rounded-md"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <Text weight="plus" className="text-ui-fg-base">
          {t(`chatbot.details.nextSteps.steps.${key}.title`)}
        </Text>
        <Text size="small" className="text-ui-fg-subtle">
          {t(`chatbot.details.nextSteps.steps.${key}.description`)}
        </Text>
      </div>
    </>
  );

  const steps = [
    !item.accounts?.length && (
      <Link
        key="channel"
        to={`/${workspaceSlug}/${ROUTES.Accounts}/create`}
        className={ROW}
      >
        {content("channel", <Channels />)}
      </Link>
    ),
    knowledgeCount === 0 && (
      <button
        key="knowledge"
        type="button"
        onClick={onOpenKnowledge}
        className={ROW}
      >
        {content("knowledge", <BookOpen />)}
      </button>
    ),
    !item.welcomeMessage?.trim() && (
      <Link
        key="welcome"
        to={CHATBOT_EDIT_SECTIONS.messages.path}
        className={ROW}
      >
        {content("welcome", <ChatBubbleLeftRight />)}
      </Link>
    ),
  ].filter(Boolean);

  if (steps.length === 0) return null;

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">{t("chatbot.details.nextSteps.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("chatbot.details.nextSteps.description")}
        </Text>
      </div>
      <ol className="divide-y">
        {steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
    </Container>
  );
};

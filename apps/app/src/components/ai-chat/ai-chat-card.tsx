import "@/styles/streamdown.css";
import "@/styles/chat-bubble.css";
import {
  ArrowPathMini,
  DocumentText,
  ExclamationCircle,
} from "@medusajs/icons";
import { Button, clx, Container, Heading, Text } from "@medusajs/ui";
import {
  Attachment,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
  Marker,
  MarkerContent,
  MarkerIcon,
  Message,
  MessageContent,
  MessageResponse,
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerViewport,
} from "@repo/ui/common-components";
import type { SourceUrlUIPart } from "ai";
import type { ReactNode } from "react";
import type React from "react";
import { useTranslation } from "react-i18next";
import { AIChatProvider, useAIChat } from "./ai-chat-provider";
import { AIChatSources } from "./ai-chat-sources";
import { BuildingLoader } from "./ai-loader";
import { chatErrorMessage } from "./chat-error-message";
import { ToolTrace } from "./tool-trace";
import {
  type ChatTransportConfig,
  isEmptyRenderModel,
  partsToRenderModel,
  type RenderModelFile,
  toolCallToChat,
} from "./use-ai-chat-stream";

// The live streaming render model has the AI SDK's shape; `toolCallToChat`
// (pure, unit-tested) adapts each call to the shared `ChatToolCall` shape that
// `ToolTrace` renders.

// Customer and bot bubbles (styles/chat-bubble.css), each growing in from its
// tail corner.
const BUBBLE_CLASS = {
  user: "chat-bubble chat-bubble--customer origin-bottom-right",
  assistant: "chat-bubble chat-bubble--bot origin-bottom-left",
};
const REPLY_ENTER =
  "transition-[opacity,filter] duration-270 ease-[ease] starting:opacity-0 starting:blur-[2px] motion-reduce:starting:blur-none";
const BUBBLE_ENTER =
  "transition-[opacity,translate,scale] duration-330 ease-out starting:translate-y-2 starting:scale-96 starting:opacity-0 motion-reduce:starting:translate-y-0 motion-reduce:starting:scale-100";

function MessageAttachments({ files }: { files: RenderModelFile[] }) {
  if (files.length === 0) {
    return null;
  }
  return (
    <AttachmentGroup className="mt-2">
      {files.map((file, index) => {
        const isImage = file.mediaType.startsWith("image/");
        return (
          <Attachment
            key={`${file.url}-${index}`}
            size="sm"
            className="w-[200px] shrink-0"
          >
            <AttachmentMedia variant={isImage ? "image" : "icon"}>
              {isImage ? (
                <img
                  src={file.url}
                  alt={file.filename ?? file.mediaType}
                  className="size-full object-cover"
                />
              ) : (
                <DocumentText />
              )}
            </AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>
                {file.filename ?? file.mediaType}
              </AttachmentTitle>
              <AttachmentDescription>{file.mediaType}</AttachmentDescription>
            </AttachmentContent>
          </Attachment>
        );
      })}
    </AttachmentGroup>
  );
}

function AIChatMessages() {
  const { messages, status, error } = useAIChat();
  const { t } = useTranslation();
  const isLoading = status === "submitted" || status === "streaming";
  const displayMessages = messages.filter((m) => m.role !== "system");

  return (
    <>
      {displayMessages.map((message, index) => {
        const isLastMessage = index === displayMessages.length - 1;
        const model = partsToRenderModel(message.parts);
        const sources = message.parts.filter(
          (part): part is SourceUrlUIPart => part.type === "source-url",
        );
        const isAssistant = message.role === "assistant";
        // The loader bubble stays put for the whole turn; tool steps are
        // added above it as the agent decides to call them.
        const showSpinner =
          isLoading &&
          isLastMessage &&
          isAssistant &&
          !model.text &&
          !model.guardrail;
        const toolCalls = model.toolCalls.map(toolCallToChat);
        const showTrace =
          isAssistant && (toolCalls.length > 0 || !!model.knowledgeCount);
        const showBubble =
          showSpinner ||
          !!model.text ||
          !!model.reasoning ||
          !!model.guardrail ||
          model.files.length > 0;

        // A stream that fails before producing output leaves an empty
        // assistant message in `messages`; the `stream-error` marker below is
        // the only feedback we should show for it.
        if (
          status === "error" &&
          message.role === "assistant" &&
          isEmptyRenderModel(model)
        ) {
          return null;
        }

        return (
          <MessageScrollerItem
            key={message.id}
            messageId={message.id}
            scrollAnchor={message.role === "user"}
          >
            <Message from={message.role}>
              {showTrace && (
                <ToolTrace
                  toolCalls={toolCalls}
                  knowledgeCount={model.knowledgeCount}
                  running={isLoading && isLastMessage}
                />
              )}
              {showBubble && (
                <MessageContent
                  className={clx(
                    BUBBLE_CLASS[isAssistant ? "assistant" : "user"],
                    BUBBLE_ENTER,
                  )}
                >
                  {model.guardrail ? (
                    <Marker className="text-ui-fg-error">
                      <MarkerIcon className="text-ui-fg-error">
                        <ExclamationCircle />
                      </MarkerIcon>
                      <MarkerContent className="whitespace-normal">
                        {t("chatbot.chat.guardrail.blocked")}
                        {model.guardrail.reason
                          ? ` ${t("chatbot.chat.guardrail.reason", { reason: model.guardrail.reason })}`
                          : ""}
                      </MarkerContent>
                    </Marker>
                  ) : showSpinner ? (
                    <BuildingLoader
                      state={t("chatbot.chat.thinking")}
                      tone="inverted"
                    />
                  ) : (
                    // The reply takes the loader's place with a short blurred
                    // fade, so the two read as one change.
                    <div className={REPLY_ENTER}>
                      {model.reasoning && (
                        <Text
                          size="xsmall"
                          className="text-ui-fg-subtle mb-1 whitespace-pre-wrap italic"
                        >
                          {model.reasoning}
                        </Text>
                      )}
                      <MessageResponse>{model.text}</MessageResponse>
                    </div>
                  )}
                  <MessageAttachments files={model.files} />
                  {message.role === "assistant" && sources.length > 0 ? (
                    <AIChatSources
                      sources={sources.map((s) => ({
                        id: s.sourceId,
                        filename: s.title,
                        sourceUrl: s.url,
                      }))}
                    />
                  ) : null}
                </MessageContent>
              )}
            </Message>
          </MessageScrollerItem>
        );
      })}
      {status === "submitted" && (
        <MessageScrollerItem key="pending">
          <Message from="assistant">
            <MessageContent
              className={clx(BUBBLE_CLASS.assistant, BUBBLE_ENTER)}
            >
              <BuildingLoader
                state={t("chatbot.chat.thinking")}
                tone="inverted"
              />
            </MessageContent>
          </Message>
        </MessageScrollerItem>
      )}
      {status === "error" && (
        <MessageScrollerItem key="stream-error">
          <Message from="assistant">
            <MessageContent>
              <Marker className="text-ui-fg-error">
                <MarkerIcon className="text-ui-fg-error">
                  <ExclamationCircle />
                </MarkerIcon>
                <MarkerContent className="whitespace-normal">
                  {chatErrorMessage(error, t("chatbot.chat.error"))}
                </MarkerContent>
              </Marker>
            </MessageContent>
          </Message>
        </MessageScrollerItem>
      )}
    </>
  );
}

export type AIChatCardProps = {
  chatbotId: string;
  transport: ChatTransportConfig;
  canSubmit?: boolean;
  renderInput?: ReactNode;
  /**
   * Actions for the card header. Passed in rather than built here because the
   * card also renders on the public preview page, where there is no workspace
   * and no session for a workspace-scoped action to use.
   */
  renderHeaderActions?: ReactNode;
  heading?: string;
  /** Secondary line under the heading (e.g. how long a share link lasts). */
  subheading?: ReactNode;
  className?: string;
};

export function AIChatCard(props: AIChatCardProps) {
  const {
    chatbotId,
    transport,
    canSubmit,
    renderInput,
    renderHeaderActions,
    heading,
    subheading,
    className,
  } = props;

  return (
    <AIChatProvider
      chatbotId={chatbotId}
      transport={transport}
      canSubmit={canSubmit}
    >
      <Container
        className={clx(
          "p-0 relative flex size-full flex-col divide-y overflow-hidden h-[600px]",
          className,
        )}
      >
        {heading && (
          <Header actions={renderHeaderActions}>
            <div className="flex min-w-0 flex-col gap-y-0.5">
              <Heading className="truncate" title={heading}>
                {heading}
              </Heading>
              {subheading}
            </div>
          </Header>
        )}
        <MessageScroller>
          <MessageScrollerViewport>
            <MessageScrollerContent>
              <AIChatMessages />
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
        {renderInput}
      </Container>
    </AIChatProvider>
  );
}
function Header({
  className,
  children,
  actions,
  ...props
}: React.ComponentProps<"div"> & { actions?: ReactNode }) {
  const { messages, onRestart } = useAIChat();
  const { t } = useTranslation();
  return (
    <div
      className={clx(
        "flex items-center justify-between gap-y-1 p-6 py-4",
        className,
      )}
      {...props}
    >
      {children}
      <div className="ml-auto flex shrink-0 items-center gap-x-2">
        {actions}
        {messages.length > 0 && (
          <Button size="small" variant="secondary" onClick={onRestart}>
            <ArrowPathMini />
            {t("chatbot.chat.restart")}
          </Button>
        )}
      </div>
    </div>
  );
}

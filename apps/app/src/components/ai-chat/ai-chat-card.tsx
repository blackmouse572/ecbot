import "@/styles/streamdown.css";
import { ArrowPathMini, DocumentText, ExclamationCircle } from "@medusajs/icons";
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
import { ToolCallList } from "./tool-call-list";
import {
  type ChatTransportConfig,
  isEmptyRenderModel,
  partsToRenderModel,
  type RenderModelFile,
  toolCallToChat,
} from "./use-ai-chat-stream";

// `ToolCallList` is shared with the platform conversation view, which reads
// persisted `ChatToolCall` records from the API. The live streaming render
// model has a different (AI SDK) shape, so `toolCallToChat` (pure, unit-tested)
// adapts it at the boundary instead of reshaping the shared component.

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
        const showSpinner =
          isLoading &&
          isLastMessage &&
          message.role === "assistant" &&
          !model.text &&
          !model.guardrail &&
          model.toolCalls.length === 0;

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
              <MessageContent>
                {model.toolCalls.length > 0 && (
                  <ToolCallList
                    toolCalls={model.toolCalls.map(toolCallToChat)}
                  />
                )}
                {model.guardrail ? (
                  <Marker className="text-ui-fg-error">
                    <MarkerIcon className="text-ui-fg-error">
                      <ExclamationCircle />
                    </MarkerIcon>
                    <MarkerContent className="whitespace-normal">
                      {t("chatbot.chat.guardrail.blocked")}
                      {model.guardrail.reason
                        ? ` — ${model.guardrail.reason}`
                        : ""}
                    </MarkerContent>
                  </Marker>
                ) : showSpinner ? (
                  <BuildingLoader state={t("chatbot.chat.thinking")} />
                ) : (
                  <>
                    {model.reasoning && (
                      <Text
                        size="xsmall"
                        className="text-ui-fg-subtle mb-1 whitespace-pre-wrap italic"
                      >
                        {model.reasoning}
                      </Text>
                    )}
                    <MessageResponse>{model.text}</MessageResponse>
                  </>
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
            </Message>
          </MessageScrollerItem>
        );
      })}
      {status === "submitted" && (
        <MessageScrollerItem key="pending">
          <Message from="assistant">
            <MessageContent>
              <BuildingLoader state={t("chatbot.chat.thinking")} />
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
                  {error?.message || t("chatbot.chat.error")}
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
            <div className="flex flex-col gap-y-0.5">
              <Heading>{heading}</Heading>
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
      <div className="ml-auto flex items-center gap-x-2">
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

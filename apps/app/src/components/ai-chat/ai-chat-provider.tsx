import type { ChatStatus, FileUIPart, UIMessage } from "ai";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { toFile } from "./file-part";
import type { ChatTransportConfig } from "./use-ai-chat-stream";
import { useAiChat } from "./use-ai-chat-stream";

export type AIChatProviderState = {
  chatbotId: string;
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error;
  /** Uploads the files first, then sends; rejects when an upload fails, so
   * the input keeps what was typed and attached. */
  onSubmit: (text: string, files?: FileUIPart[]) => Promise<void>;
  /** Whether this surface takes files (its transport can upload). */
  canAttach: boolean;
  /** Files of the message being sent are still uploading. */
  uploading: boolean;
  onRestart: () => void;
  /**
   * Write into the transcript directly. Needed by surfaces whose messages do
   * not all come from this chat's own stream — the website widget seeds a
   * persisted history on mount and appends operator replies it polls for.
   */
  setMessages: (
    messages: UIMessage[] | ((current: UIMessage[]) => UIMessage[]),
  ) => void;
};

const AIChatContext = createContext<AIChatProviderState | null>(null);

type AIChatProviderInnerProps = React.PropsWithChildren<{
  chatbotId: string;
  transport: ChatTransportConfig;
  canSubmit: boolean;
  onRestart: () => void;
  registerStop: (stop: () => void) => void;
}>;

const AIChatProviderInner = ({
  chatbotId,
  transport,
  canSubmit,
  onRestart,
  registerStop,
  children,
}: AIChatProviderInnerProps) => {
  const { id, messages, status, error, sendMessage, stop, setMessages } =
    useAiChat({
      chatbotId,
      transport,
    });

  registerStop(() => {
    void stop();
  });

  const [uploading, setUploading] = useState(false);
  const upload = transport.upload;

  const onSubmit = useCallback(
    async (text: string, files: FileUIPart[] = []) => {
      // `canSubmit` gates on the caller's readiness — on the authed page that
      // is the auth token landing, which also keeps a submit from racing ahead
      // of ClientProvider configuring the shared client.
      const sent = upload ? files : [];
      if ((!text.trim() && !sent.length) || !canSubmit) return;
      if (!sent.length || !upload) {
        void sendMessage({ text });
        return;
      }
      setUploading(true);
      try {
        // The input hands files over as data URLs; the transcript keeps
        // those for the thumbnails, the API gets the stored keys.
        const attachments = await Promise.all(
          sent.map(async (part) => upload(await toFile(part), id)),
        );
        void sendMessage({ text, files: sent, metadata: { attachments } });
      } finally {
        setUploading(false);
      }
    },
    [sendMessage, canSubmit, upload, id],
  );

  const value = useMemo<AIChatProviderState>(
    () => ({
      chatbotId,
      messages,
      status,
      error,
      onSubmit,
      canAttach: !!upload,
      uploading,
      onRestart,
      setMessages,
    }),
    [
      chatbotId,
      messages,
      status,
      error,
      onSubmit,
      upload,
      uploading,
      onRestart,
      setMessages,
    ],
  );

  return (
    <AIChatContext.Provider value={value}>{children}</AIChatContext.Provider>
  );
};

export const AIChatProvider = (
  props: React.PropsWithChildren<{
    chatbotId: string;
    transport: ChatTransportConfig;
    canSubmit?: boolean;
    onRestart?: () => void;
  }>,
) => {
  const {
    chatbotId,
    transport,
    canSubmit = true,
    onRestart: onRestartProp,
    children,
  } = props;
  // Bumping `generation` remounts `AIChatProviderInner`, which hands us a
  // fresh `useChat` instance (new session id, empty messages) — the
  // equivalent of the old hook's `restart()` regenerating its session ref.
  const [generation, setGeneration] = useState(0);
  const stopRef = useRef<() => void>(() => {});

  const onRestart = useCallback(() => {
    stopRef.current();
    setGeneration((g) => g + 1);
    onRestartProp?.();
  }, [onRestartProp]);

  const registerStop = useCallback((stop: () => void) => {
    stopRef.current = stop;
  }, []);

  return (
    <AIChatProviderInner
      key={generation}
      chatbotId={chatbotId}
      transport={transport}
      canSubmit={canSubmit}
      onRestart={onRestart}
      registerStop={registerStop}
    >
      {children}
    </AIChatProviderInner>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAIChat = () => {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error("useAIChat must be used within an AIChatProvider");
  }
  return context;
};

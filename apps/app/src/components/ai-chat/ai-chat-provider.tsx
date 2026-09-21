import type { ChatStatus, UIMessage } from "ai";
import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ChatTransportConfig } from "./use-ai-chat-stream";
import { useAiChat } from "./use-ai-chat-stream";

export type AIChatProviderState = {
  chatbotId: string;
  messages: UIMessage[];
  status: ChatStatus;
  error?: Error;
  onSubmit: (text: string) => void;
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
  const { messages, status, error, sendMessage, stop, setMessages } =
    useAiChat({
      chatbotId,
      transport,
    });

  registerStop(() => {
    void stop();
  });

  const onSubmit = useCallback(
    (text: string) => {
      // `canSubmit` gates on the caller's readiness — on the authed page that
      // is the auth token landing, which also keeps a submit from racing ahead
      // of ClientProvider configuring the shared client.
      if (!text.trim() || !canSubmit) return;
      void sendMessage({ text });
    },
    [sendMessage, canSubmit],
  );

  const value = useMemo<AIChatProviderState>(
    () => ({
      chatbotId,
      messages,
      status,
      error,
      onSubmit,
      onRestart,
      setMessages,
    }),
    [chatbotId, messages, status, error, onSubmit, onRestart, setMessages],
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
  }>,
) => {
  const { chatbotId, transport, canSubmit = true, children } = props;
  // Bumping `generation` remounts `AIChatProviderInner`, which hands us a
  // fresh `useChat` instance (new session id, empty messages) — the
  // equivalent of the old hook's `restart()` regenerating its session ref.
  const [generation, setGeneration] = useState(0);
  const stopRef = useRef<() => void>(() => {});

  const onRestart = useCallback(() => {
    stopRef.current();
    setGeneration((g) => g + 1);
  }, []);

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

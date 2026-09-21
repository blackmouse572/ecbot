import { AIChatCard } from "@/components/ai-chat/ai-chat-card";
import { AIChatInput } from "@/components/ai-chat/ai-chat-input";
import { shareChatTransport } from "@/components/ai-chat/use-ai-chat-stream";
import { TurnstileField, useTurnstile } from "@repo/auth/components";
import { ExclamationCircle } from "@medusajs/icons";
import { Heading, Text } from "@medusajs/ui";
import { useDate } from "@/hooks/use-date";
import {
  chatbotPreviewPublicControllerMetaV1,
  type ChatbotPreviewMetaResponseDto,
} from "@repo/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

// Empty (local dev / tests) renders no widget and the API, which is also
// unconfigured there, skips verification — the two switch off together.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

/**
 * Standalone, login-free chatbot preview reached through a signed share link
 * (issue #80). Deliberately outside `ProtectedRoute` — and outside
 * `AuthLayout`, which bounces signed-in users away.
 */
export function Preview() {
  const { t } = useTranslation();
  const { token } = useParams();
  const { getRelativeDateOrFullDate } = useDate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["chatbot-preview", token],
    queryFn: async () => {
      const res = await chatbotPreviewPublicControllerMetaV1({
        path: { token: token! },
      });
      return (
        res.data as unknown as { data: ChatbotPreviewMetaResponseDto }
      ).data;
    },
    enabled: !!token,
    // A share token is fixed for the life of the page; a failure means the
    // link is invalid or expired, and retrying will not change that.
    retry: false,
  });

  const turnstile = useTurnstile(
    TURNSTILE_SITE_KEY
      ? {
          siteKey: TURNSTILE_SITE_KEY,
          messages: {
            required: t("chatbot.preview.turnstile.required"),
            failed: t("chatbot.preview.turnstile.failed"),
          },
        }
      : undefined,
    "chatbot-preview",
  );

  // Read through a ref so a re-issued challenge token doesn't rebuild the
  // transport (and with it the chat session) mid-conversation.
  const turnstileTokenRef = useRef<string | undefined>(undefined);
  turnstileTokenRef.current = turnstile.token;

  const transport = useMemo(
    () => shareChatTransport(token ?? "", () => turnstileTokenRef.current),
    [token],
  );

  if (!token || isError) {
    return <PreviewUnavailable />;
  }

  if (isLoading || !data) {
    return (
      <div className="bg-ui-bg-subtle flex h-screen w-screen items-center justify-center" />
    );
  }

  return (
    <div className="bg-ui-bg-subtle flex h-screen w-screen flex-col gap-y-2 p-4">
      <AIChatCard
        heading={data.name}
        subheading={
          <Text size="xsmall" className="text-ui-fg-subtle">
            {t("chatbot.preview.expiresIn", {
              time: getRelativeDateOrFullDate(new Date(data.expiresAt), {
                includeTime: true,
              }),
            })}
          </Text>
        }
        // The real chatbot id stays server-side — it is only ever resolved
        // from the token. The card uses this solely for the tool-invocation
        // query key, which the share transport disables anyway.
        chatbotId="shared-preview"
        transport={transport}
        renderInput={
          <>
            <AIChatInput />
            <div className="px-4 pb-3 empty:hidden">
              <TurnstileField turnstile={turnstile} />
            </div>
          </>
        }
        className="min-h-0 w-full flex-1"
      />
      <Text size="xsmall" className="text-ui-fg-muted self-center">
        {t("chatbot.preview.poweredBy")}
      </Text>
    </div>
  );
}

function PreviewUnavailable() {
  const { t } = useTranslation();

  return (
    <div className="bg-ui-bg-subtle flex h-screen w-screen flex-col items-center justify-center gap-y-2 p-4 text-center">
      <ExclamationCircle className="text-ui-fg-muted" />
      <Heading level="h2">{t("chatbot.preview.invalid")}</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        {t("chatbot.preview.invalidHint")}
      </Text>
    </div>
  );
}

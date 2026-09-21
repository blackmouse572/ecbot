import { AIChatCard } from "@/components/ai-chat/ai-chat-card";
import { AIChatInput } from "@/components/ai-chat/ai-chat-input";
import { widgetChatTransport } from "@/components/ai-chat/use-ai-chat-stream";
import { ExclamationCircle } from "@medusajs/icons";
import { Heading, Text } from "@medusajs/ui";
import { TurnstileField, useTurnstile } from "@repo/auth/components";
import { widgetPublicControllerMetaV1 } from "@repo/client";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { useVisitorId } from "./use-visitor-id";
import { useWidgetTranscript } from "./use-widget-transcript";

// Empty (local dev / tests) renders no widget and the API, which is also
// unconfigured there, skips verification — the two switch off together.
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

/**
 * The embeddable website chat widget (issue #374).
 *
 * Rendered inside the iframe that `public/widget.js` injects into a customer's
 * page, so it is deliberately outside `ProtectedRoute` and `AuthLayout` — the
 * visitor is anonymous and has no eccho session. The iframe is what isolates our
 * Tailwind Preflight from the host page's CSS.
 *
 * Where the widget is allowed to render is enforced by the `frame-ancestors`
 * CSP the Worker serves this page with (ADR-0014); the referrer check below is
 * a second, advisory layer that produces a readable message rather than a blank
 * frame when a key is pasted onto the wrong site.
 */
export function Widget() {
  const { t } = useTranslation();
  const { key } = useParams();
  const visitorId = useVisitorId(key);

  // The parent page's URL. Only available cross-origin as an origin, which is
  // exactly the granularity the allowlist works at.
  const parentOrigin = useMemo(() => {
    if (!document.referrer) return undefined;
    try {
      return new URL(document.referrer).origin;
    } catch {
      return undefined;
    }
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["widget-meta", key],
    queryFn: async () => {
      const res = await widgetPublicControllerMetaV1({
        path: { key: key! },
      });
      return (res.data as unknown as { data: WidgetMeta }).data;
    },
    enabled: !!key,
    // A widget key is fixed for the life of the page; a failure means the key
    // is wrong or revoked, and retrying will not change that.
    retry: false,
  });

  const turnstile = useTurnstile(
    TURNSTILE_SITE_KEY
      ? {
          siteKey: TURNSTILE_SITE_KEY,
          messages: {
            required: t("widget.turnstile.required"),
            failed: t("widget.turnstile.failed"),
          },
        }
      : undefined,
    "website-widget",
  );

  // Read through a ref so a re-issued challenge token doesn't rebuild the
  // transport (and with it the chat session) mid-conversation.
  const turnstileTokenRef = useRef<string | undefined>(undefined);
  turnstileTokenRef.current = turnstile.token;

  const transport = useMemo(
    () =>
      widgetChatTransport(
        key ?? "",
        visitorId,
        parentOrigin,
        () => turnstileTokenRef.current,
      ),
    [key, visitorId, parentOrigin],
  );

  // Tell the loader the frame is alive so it can stop showing a spinner.
  useEffect(() => {
    window.parent?.postMessage({ type: "eccho:ready" }, "*");
  }, []);

  const originAllowed =
    !data ||
    data.allowedOrigins.length === 0 ||
    !parentOrigin ||
    data.allowedOrigins.some(
      (origin) => origin.toLowerCase() === parentOrigin.toLowerCase(),
    );

  if (!key || isError) {
    return <WidgetUnavailable message={t("widget.invalid")} />;
  }

  if (isLoading || !data) {
    return <div className="bg-ui-bg-base h-screen w-screen" />;
  }

  if (!originAllowed) {
    return <WidgetUnavailable message={t("widget.originNotAllowed")} />;
  }

  return (
    <div className="bg-ui-bg-base flex h-screen w-screen flex-col">
      <AIChatCard
        heading={data.name}
        subheading={
          data.welcomeMessage ? (
            <Text size="xsmall" className="text-ui-fg-subtle">
              {data.welcomeMessage}
            </Text>
          ) : undefined
        }
        // The real chatbot id stays server-side — it is only ever resolved from
        // the widget key. The card uses this solely for the tool-invocation
        // query key, which the widget transport disables anyway.
        chatbotId="website-widget"
        transport={transport}
        renderInput={
          <>
            {/* Rendered inside AIChatCard's provider — the transcript sync
                needs the chat context, which the card owns. */}
            <TranscriptSync widgetKey={key} visitorId={visitorId} />
            <AIChatInput />
            <div className="px-4 pb-3 empty:hidden">
              <TurnstileField turnstile={turnstile} />
            </div>
          </>
        }
        className="min-h-0 w-full flex-1 rounded-none border-0"
      />
    </div>
  );
}

/** Nothing to draw — it only writes polled messages into the chat context. */
function TranscriptSync({
  widgetKey,
  visitorId,
}: {
  widgetKey: string | undefined;
  visitorId: string;
}) {
  useWidgetTranscript({ widgetKey, visitorId });
  return null;
}

type WidgetMeta = {
  name: string;
  avatar?: string;
  welcomeMessage?: string;
  primaryLanguage?: string;
  theme?: Record<string, unknown>;
  allowedOrigins: string[];
};

function WidgetUnavailable({ message }: { message: string }) {
  const { t } = useTranslation();

  return (
    <div className="bg-ui-bg-base flex h-screen w-screen flex-col items-center justify-center gap-y-2 p-4 text-center">
      <ExclamationCircle className="text-ui-fg-muted" />
      <Heading level="h2">{message}</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        {t("widget.invalidHint")}
      </Text>
    </div>
  );
}

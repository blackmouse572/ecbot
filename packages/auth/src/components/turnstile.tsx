import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile for public auth forms.
 *
 * Server-side counterpart to {@link HoneypotField}: the honeypot catches naive
 * form-fillers in the browser, Turnstile is what the API actually verifies.
 *
 * Optional by design — pass no config and nothing renders, so consumers without
 * a site key (local dev, tests) keep working unchanged.
 */

interface ITurnstileConfig {
  siteKey: string;
  messages: {
    /** Shown when the widget genuinely never issues a token in time. */
    required: string;
    /** Shown when the challenge itself errors or expires. */
    failed: string;
    /** Shown while a too-fast submit is waiting on the widget. Omit to show nothing. */
    verifying?: string;
    /**
     * Shown when a submit is blocked because the widget errored or never
     * answered (blocked script, failed challenge). Falls back to `failed`
     * or `required`.
     */
    unavailable?: string;
    /** Label of the button that runs the check again. Omit for no button. */
    retry?: string;
  };
}

/**
 * Per-form action, echoed back by siteverify so the API can reject a token
 * solved on a different form. MUST match ENUM_TURNSTILE_ACTION in apps/api.
 */
type TTurnstileAction = "login" | "sign-up" | "chatbot-preview";

/** Grace window for a submit that races the invisible widget's own solve. */
const TOKEN_WAIT_TIMEOUT_MS = 3000;

const useTurnstile = (config?: ITurnstileConfig, action?: TTurnstileAction) => {
  const ref = useRef<TurnstileInstance>(null);
  const [token, setToken] = useState<string>();
  const [error, setError] = useState<string>();
  const [isVerifying, setIsVerifying] = useState(false);
  // True while the widget shows a challenge the person has to click.
  const [isInteractive, setIsInteractive] = useState(false);
  // Set once a submit was turned away for want of a token. From then on the
  // message offers a retry instead of a hint the person cannot act on.
  const [isBlocked, setIsBlocked] = useState(false);
  // Bumped by retry to mount a fresh widget.
  const [widgetKey, setWidgetKey] = useState(0);
  const waitersRef = useRef<Array<(token: string | undefined) => void>>([]);

  const flushWaiters = (value: string | undefined) => {
    if (!waitersRef.current.length) return;
    waitersRef.current.forEach((resolve) => resolve(value));
    waitersRef.current = [];
    setIsVerifying(false);
  };

  // The widget solves invisibly a beat after mount. A resolved token or a
  // hard error both mean nobody is waiting on the widget anymore.
  useEffect(() => {
    if (token) flushWaiters(token);
  }, [token]);
  useEffect(() => {
    if (error) flushWaiters(undefined);
  }, [error]);

  return {
    config,
    action,
    ref,
    token,
    error,
    isVerifying,
    isInteractive,
    isBlocked,
    widgetKey,
    setToken,
    setError,
    setIsInteractive,
    /**
     * Resolves with the token for the top of a submit handler. If the user
     * submitted before the invisible widget finished solving, waits briefly
     * instead of failing outright — Turnstile normally resolves within a
     * second. Only surfaces the `required` error if it never arrives.
     */
    waitForToken: async (): Promise<string | undefined> => {
      if (!config) return undefined;
      if (token) return token;

      const waited = error
        ? undefined
        : await new Promise<string | undefined>((resolve) => {
            setIsVerifying(true);
            waitersRef.current.push(resolve);
            setTimeout(() => {
              if (!waitersRef.current.includes(resolve)) return; // already flushed
              waitersRef.current = waitersRef.current.filter(
                (r) => r !== resolve,
              );
              setIsVerifying(false);
              resolve(undefined);
            }, TOKEN_WAIT_TIMEOUT_MS);
          });
      // A submit turned away must always say so: never a silent no-op.
      if (!waited) setIsBlocked(true);
      return waited;
    },
    /**
     * Runs the check again after it failed. A widget that loaded gets a
     * fresh challenge; a script that never loaded (blocker, network) only
     * comes back with a reload.
     */
    retry: () => {
      if (!config) return;
      setToken(undefined);
      setError(undefined);
      setIsBlocked(false);
      setIsInteractive(false);
      if (typeof window !== "undefined" && !("turnstile" in window)) {
        window.location.reload();
        return;
      }
      ref.current?.reset();
      setWidgetKey((key) => key + 1);
    },
    /**
     * Turnstile tokens are single-use. Without this a second submit replays a
     * spent token and the API rejects it as `timeout-or-duplicate`.
     */
    reset: () => {
      if (!config) return;
      ref.current?.reset();
      setToken(undefined);
      setError(undefined);
      setIsBlocked(false);
    },
  };
};

/** The one line under the widget, if any. */
const turnstileMessage = (turnstile: TTurnstile) => {
  const { config, error, isBlocked, isInteractive, isVerifying } = turnstile;
  if (!config) return undefined;
  const { messages } = config;
  if (isBlocked) {
    // An open challenge just needs a click; anything else means the check
    // itself is broken and the person needs a way out.
    if (isInteractive) return { tone: "error", text: messages.required };
    return {
      tone: "error",
      text: messages.unavailable ?? error ?? messages.required,
      canRetry: true,
    };
  }
  if (error) return { tone: "error", text: error, canRetry: true };
  if (isVerifying && messages.verifying) {
    return { tone: "muted", text: messages.verifying };
  }
  return undefined;
};

type TTurnstile = ReturnType<typeof useTurnstile>;

const TurnstileField: React.FC<{ turnstile: TTurnstile }> = ({ turnstile }) => {
  const { config } = turnstile;
  if (!config) return null;
  const message = turnstileMessage(turnstile);

  return (
    <div className="flex flex-col gap-y-1">
      <Turnstile
        key={turnstile.widgetKey}
        ref={turnstile.ref}
        siteKey={config.siteKey}
        onSuccess={(token) => {
          turnstile.setToken(token);
          turnstile.setError(undefined);
          turnstile.setIsInteractive(false);
        }}
        onExpire={() => turnstile.setToken(undefined)}
        onError={() => {
          turnstile.setToken(undefined);
          turnstile.setError(config.messages.failed);
        }}
        onBeforeInteractive={() => turnstile.setIsInteractive(true)}
        onAfterInteractive={() => turnstile.setIsInteractive(false)}
        options={{
          action: turnstile.action,
          size: "flexible",
          appearance: "interaction-only",
        }}
      />
      {message?.tone === "error" && (
        <div
          role="alert"
          className="txt-small text-ui-fg-error flex flex-wrap items-center gap-x-2"
        >
          <span>{message.text}</span>
          {message.canRetry && config.messages.retry && (
            <button
              type="button"
              onClick={turnstile.retry}
              className="txt-small-plus text-ui-fg-interactive underline-offset-2 hover:underline"
            >
              {config.messages.retry}
            </button>
          )}
        </div>
      )}
      {message?.tone === "muted" && (
        <p className="txt-small text-ui-fg-muted">{message.text}</p>
      )}
    </div>
  );
};

export { TurnstileField, useTurnstile };
export type { ITurnstileConfig, TTurnstile, TTurnstileAction };

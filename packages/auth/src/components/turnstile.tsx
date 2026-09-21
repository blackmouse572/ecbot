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
    setToken,
    setError,
    /**
     * Resolves with the token for the top of a submit handler. If the user
     * submitted before the invisible widget finished solving, waits briefly
     * instead of failing outright — Turnstile normally resolves within a
     * second. Only surfaces the `required` error if it never arrives.
     */
    waitForToken: (): Promise<string | undefined> => {
      if (!config) return Promise.resolve(undefined);
      if (token) return Promise.resolve(token);
      if (error) return Promise.resolve(undefined);

      setIsVerifying(true);
      return new Promise((resolve) => {
        waitersRef.current.push(resolve);
        setTimeout(() => {
          if (!waitersRef.current.includes(resolve)) return; // already flushed
          waitersRef.current = waitersRef.current.filter((r) => r !== resolve);
          setIsVerifying(false);
          setError(config.messages.required);
          resolve(undefined);
        }, TOKEN_WAIT_TIMEOUT_MS);
      });
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
    },
  };
};

type TTurnstile = ReturnType<typeof useTurnstile>;

const TurnstileField: React.FC<{ turnstile: TTurnstile }> = ({ turnstile }) => {
  const { config } = turnstile;
  if (!config) return null;

  return (
    <div className="flex flex-col gap-y-1">
      <Turnstile
        ref={turnstile.ref}
        siteKey={config.siteKey}
        onSuccess={(token) => {
          turnstile.setToken(token);
          turnstile.setError(undefined);
        }}
        onExpire={() => turnstile.setToken(undefined)}
        onError={() => {
          turnstile.setToken(undefined);
          turnstile.setError(config.messages.failed);
        }}
        options={{
          action: turnstile.action,
          size: "flexible",
          appearance: "interaction-only",
        }}
      />
      {turnstile.error && (
        <p className="txt-small text-ui-fg-error">{turnstile.error}</p>
      )}
      {!turnstile.error && turnstile.isVerifying && config.messages.verifying && (
        <p className="txt-small text-ui-fg-muted">
          {config.messages.verifying}
        </p>
      )}
    </div>
  );
};

export { TurnstileField, useTurnstile };
export type { ITurnstileConfig, TTurnstile, TTurnstileAction };

import { useAccount } from "@/hooks/api";
import { toast } from "@medusajs/ui";
import { useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { LinkedAccountRef } from "./builder-state";
import { isConnectableAccountType } from "./channel-accounts";

/**
 * The channel a quick create arrived with. `ensure` resolves once its
 * details settle: the channel to pre-connect and name-seed from, or
 * undefined when there is none, the type can never carry an agent, or the
 * load failed (the owner is told once and the builder continues without it).
 */
export function usePrefillChannel(accountId: string, enabled: boolean) {
  const { t } = useTranslation();
  const { account, isError } = useAccount(accountId, { enabled });
  const settle = useRef<((value: LinkedAccountRef | undefined) => void) | null>(null);
  const settled = useRef<Promise<LinkedAccountRef | undefined> | null>(null);
  const notified = useRef(false);

  // One promise per mount, resolved by the first effect that sees the query
  // settle; callers await it before starting or linking.
  if (enabled && !settled.current) {
    settled.current = new Promise((resolve) => { settle.current = resolve; });
  }

  useEffect(() => {
    if (!enabled || !settle.current) return;
    if (account) {
      settle.current(
        isConnectableAccountType(account.type)
          ? { id: account.id, type: account.type, name: account.name }
          : undefined,
      );
      settle.current = null;
    } else if (isError) {
      if (!notified.current) {
        notified.current = true;
        toast.error(t("agentBuilder.ui.channelLoadFailed"));
      }
      settle.current(undefined);
      settle.current = null;
    }
  }, [enabled, account, isError, t]);

  const ensure = useCallback(
    () => settled.current ?? Promise.resolve(undefined),
    [],
  );

  return { ensure };
}

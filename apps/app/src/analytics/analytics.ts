import {
  IMPERSONATION_STORAGE_KEY,
  isImpersonationActive,
  type ImpersonationSession,
} from "@/modules/impersonation/state";
import type { AnalyticsAdapter } from "./analytics-adapter";
import type { AnalyticsEventName, AnalyticsEvents } from "./analytics-events";

/**
 * Surfaces that never report: the website widget runs on a customer's own
 * site for their shoppers, a shared preview is anonymous, and impersonation
 * is staff acting as a member.
 */
const NEVER_BOOT = [
  /^\/widget(\/|$)/,
  /^\/preview(\/|$)/,
  /^\/impersonate(\/|$)/,
];

function impersonating(): boolean {
  try {
    const raw = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
    return isImpersonationActive(
      raw ? (JSON.parse(raw) as ImpersonationSession) : null,
    );
  } catch {
    return false;
  }
}

export function canBoot(pathname: string, isImpersonating: boolean): boolean {
  return !isImpersonating && !NEVER_BOOT.some((re) => re.test(pathname));
}

/**
 * The seam the app calls. Nothing happens until `boot` succeeds, every call
 * re-checks the current path and impersonation, and an adapter that throws
 * never breaks the page.
 */
export function createAnalytics(
  adapters: AnalyticsAdapter[],
  location: () => string = () => window.location.pathname,
  isImpersonating: () => boolean = impersonating,
) {
  let booted = false;
  // Ids already captured by `captureOnce`, for this signed-in session.
  const seen = new Set<string>();
  const allowed = () => canBoot(location(), isImpersonating());
  // A tab that opened on a refused path (a preview, say) and then navigated
  // to an allowed one boots on its first call there.
  const active = () => (booted ? allowed() : boot());

  const each = (call: (adapter: AnalyticsAdapter) => void) => {
    for (const adapter of adapters) {
      try {
        call(adapter);
      } catch (error) {
        console.warn("[analytics]", error);
      }
    }
  };

  function boot(): boolean {
    if (booted) return true;
    if (!adapters.length || !allowed()) return false;
    booted = true;
    each((a) => a.boot());
    return true;
  }

  function capture<E extends AnalyticsEventName>(
    event: E,
    properties: AnalyticsEvents[E],
  ): boolean {
    if (!active()) return false;
    each((a) => a.capture(event, properties));
    return true;
  }

  return {
    boot,
    identify(userId: string | undefined) {
      if (userId && active()) each((a) => a.identify(userId));
    },
    group(workspaceId: string | undefined) {
      if (workspaceId && active()) each((a) => a.group(workspaceId));
    },
    /** Logout: forget who this was, and let the next person's funnel start fresh. */
    reset() {
      seen.clear();
      if (booted) each((a) => a.reset());
    },
    capture,
    /**
     * Captures once per `id` until `reset`. An id is only used up when the
     * event actually went out, so a refused path does not swallow it.
     */
    captureOnce<E extends AnalyticsEventName>(
      id: string,
      event: E,
      properties: AnalyticsEvents[E],
    ) {
      if (seen.has(id) || !capture(event, properties)) return;
      seen.add(id);
    },
  };
}

// Enterprise overlay: `src/ee/` is gitignored in the public repo. Vite resolves
// the glob at transform time; with no match it is `{}` and the open edition
// bundles no analytics code at all.
const modules = import.meta.glob<{ default: AnalyticsAdapter }>(
  "../ee/**/analytics.ts",
  { eager: true },
);

export const analytics = createAnalytics(
  Object.keys(modules)
    .sort()
    .map((key) => modules[key].default),
);

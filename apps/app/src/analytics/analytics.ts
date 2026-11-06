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
  const active = () => booted && canBoot(location(), isImpersonating());
  const each = (call: (adapter: AnalyticsAdapter) => void) => {
    for (const adapter of adapters) {
      try {
        call(adapter);
      } catch (error) {
        console.warn("[analytics]", error);
      }
    }
  };

  return {
    boot(): boolean {
      if (booted) return true;
      if (!adapters.length || !canBoot(location(), isImpersonating()))
        return false;
      booted = true;
      each((a) => a.boot());
      return true;
    },
    identify(userId: string | undefined) {
      if (userId && active()) each((a) => a.identify(userId));
    },
    group(workspaceId: string | undefined) {
      if (workspaceId && active()) each((a) => a.group(workspaceId));
    },
    reset() {
      if (booted) each((a) => a.reset());
    },
    capture<E extends AnalyticsEventName>(
      event: E,
      properties: AnalyticsEvents[E],
    ) {
      if (active()) each((a) => a.capture(event, properties));
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

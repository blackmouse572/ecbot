import { impersonationAtom } from "@/modules/impersonation";
import {
  authSharedControllerRefreshV1,
  client,
  type AuthRefreshResponseDto,
} from "@repo/client";
import { getDefaultStore } from "jotai";
import { loginRedirectPath } from "./login-redirect";
import { logoutGuard, tokenAtom } from "./state";

// 401s on these calls are handled by their callers: the refresh call itself
// (refreshing to fix a failed refresh would loop), and the impersonation
// calls (useImpersonationRefresh / useEndImpersonation own those).
const SKIP_URL_FRAGMENTS = [
  "/shared/auth/refresh",
  "/impersonate/end",
  "/impersonate/refresh",
];

// Marks a request already retried after a refresh, so a second 401 on it ends
// the session instead of refreshing again.
const RETRIED = "_authRetried";

export interface AuthSessionHandlers {
  /** A 401 while impersonating: there is no refresh cookie to renew with. */
  onImpersonationExpired: () => void;
  /**
   * The refresh failed, or the retried request was still 401. Clears the
   * session and sends the user to /login. `refreshErrorStatusCode` is the
   * refresh call's error code (e.g. a banned user), when it got that far.
   */
  onSessionExpired: (refreshErrorStatusCode: number | null) => Promise<void>;
}

// Used until React mounts useRefreshTokenEffect: the first route loaders and
// queries run before any component effect, and a stale stored token must not
// leave them on the error boundary.
const defaultHandlers: AuthSessionHandlers = {
  onImpersonationExpired: () => {},
  onSessionExpired: () => {
    getDefaultStore().set(tokenAtom, null);
    window.location.replace(loginRedirectPath(window.location));
    // The page is unloading: never settle, so no error UI flashes first.
    return new Promise<void>(() => {});
  },
};

let handlers: AuthSessionHandlers = defaultHandlers;

/** Swap in the React-side handlers (logout, banned prompt); null restores the defaults. */
export function setAuthSessionHandlers(next: AuthSessionHandlers | null) {
  handlers = next ?? defaultHandlers;
}

type RefreshResult = { token: string | null; errorStatusCode: number | null };

// Single-flight: concurrent 401s share one refresh request.
let pendingRefresh: Promise<RefreshResult> | null = null;
// Concurrent failures share one logout too (one prompt, one redirect).
let pendingExpiry: Promise<void> | null = null;

function expireSession(refreshErrorStatusCode: number | null) {
  pendingExpiry ??= handlers
    .onSessionExpired(refreshErrorStatusCode)
    .finally(() => {
      pendingExpiry = null;
    });
  return pendingExpiry;
}

async function refreshAccessToken(): Promise<RefreshResult> {
  try {
    const response = await authSharedControllerRefreshV1({
      withCredentials: true,
      headers: { Authorization: null },
      throwOnError: false,
    });
    const body = response.data as unknown as {
      data: AuthRefreshResponseDto;
    } | null;
    if (body?.data?.accessToken) {
      return { token: body.data.accessToken, errorStatusCode: null };
    }
    // throwOnError is false, so a 403 (e.g. a banned user) lands here as
    // `error`, not as a thrown error.
    return {
      token: null,
      errorStatusCode: (response.error as A)?.statusCode ?? null,
    };
  } catch (error) {
    console.error("Failed to refresh token:", (error as A)?.message);
    return {
      token: null,
      errorStatusCode: (error as A)?.response?.data?.statusCode ?? null,
    };
  }
}

function sharedRefresh(): Promise<RefreshResult> {
  pendingRefresh ??= refreshAccessToken().finally(() => {
    pendingRefresh = null;
  });
  return pendingRefresh;
}

function retry(error: A, token: string) {
  return client.instance.request({
    ...error.config,
    [RETRIED]: true,
    headers: { ...error.config?.headers, Authorization: `Bearer ${token}` },
  } as A);
}

export async function handleAuthError(error: A): Promise<A> {
  const url: string = error?.request?.responseURL ?? error?.config?.url ?? "";
  if (
    error?.response?.status !== 401 ||
    SKIP_URL_FRAGMENTS.some((fragment) => url.includes(fragment)) ||
    // While a logout is in flight, client.clear() refetches mounted queries
    // without a token: this must not resurrect the session.
    logoutGuard.current
  ) {
    return Promise.reject(error);
  }

  const store = getDefaultStore();
  if (store.get(impersonationAtom)) {
    handlers.onImpersonationExpired();
    return Promise.reject(error);
  }

  // At most one refresh + retry per request.
  if (error.config?.[RETRIED]) {
    await expireSession(null);
    return Promise.reject(error);
  }

  // Another request already refreshed after this one was sent: retry with
  // the new token instead of refreshing again.
  // getOnInit storage is synchronous, never a Promise.
  const current = store.get(tokenAtom) as string | null;
  const sent = error.config?.headers?.Authorization;
  if (current && sent && sent !== `Bearer ${current}`) {
    return retry(error, current);
  }

  const { token, errorStatusCode } = await sharedRefresh();
  if (!token) {
    console.error("Token refresh failed, logging out");
    await expireSession(errorStatusCode);
    return Promise.reject(error);
  }
  store.set(tokenAtom, token);
  return retry(error, token);
}

/**
 * Renews an invalid stored access token with the refresh cookie and retries
 * the request once. Registered at boot, next to the request interceptor and
 * before the router, so the initial loaders and queries are covered too.
 */
export function registerAuthResponseInterceptor(): void {
  client.instance.interceptors.response.use(
    (response) => response,
    handleAuthError,
  );
}

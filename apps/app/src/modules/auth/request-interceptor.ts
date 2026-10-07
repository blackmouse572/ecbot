import { client } from "@repo/client";
import { getDefaultStore } from "jotai";
import { impersonationAtom } from "@/modules/impersonation";
import { pickAuthToken } from "./pick-auth-token";
import { tokenAtom } from "./state";

// The refresh call itself must never carry a (possibly stale) Authorization
// header — mirrors the URL check in the 401 response interceptor.
const REFRESH_URL_FRAGMENT = "/shared/auth/refresh";

// Stamps every outgoing request with the current token (a live impersonation
// token takes precedence), read synchronously
// off the (localStorage-backed) atom — no async wait, so this closes the
// route-loader race: register it before the router is created and every
// loader-triggered request already carries the right header, or none.
export function registerAuthRequestInterceptor(): void {
  client.instance.interceptors.request.use((config: A) => {
    if (config.url?.includes(REFRESH_URL_FRAGMENT)) {
      return config;
    }

    const store = getDefaultStore();
    const token = pickAuthToken(
      store.get(impersonationAtom),
      store.get(tokenAtom),
    );
    config.headers = {
      ...config.headers,
      Authorization: token ? `Bearer ${token}` : undefined,
    };
    return config;
  });
}

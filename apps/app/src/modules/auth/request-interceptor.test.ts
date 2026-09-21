import { getDefaultStore } from "jotai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { requestUse } = vi.hoisted(() => ({ requestUse: vi.fn() }));

vi.mock("@repo/client", () => ({
  client: { instance: { interceptors: { request: { use: requestUse } } } },
}));

import { tokenAtom } from "./state";
import { registerAuthRequestInterceptor } from "./request-interceptor";

function getRegisteredHandler() {
  return requestUse.mock.calls.at(-1)![0] as (config: A) => A;
}

describe("registerAuthRequestInterceptor", () => {
  beforeEach(() => {
    requestUse.mockClear();
    getDefaultStore().set(tokenAtom, null);
  });

  it("stamps Authorization from the current token synchronously", () => {
    getDefaultStore().set(tokenAtom, "my-token");
    registerAuthRequestInterceptor();

    const config = getRegisteredHandler()({ url: "/api/v1/user/me", headers: {} });

    expect(config.headers.Authorization).toBe("Bearer my-token");
  });

  it("leaves Authorization unset when there is no token", () => {
    registerAuthRequestInterceptor();

    const config = getRegisteredHandler()({ url: "/api/v1/user/me", headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it("does not stamp Authorization on the refresh call itself", () => {
    getDefaultStore().set(tokenAtom, "my-token");
    registerAuthRequestInterceptor();

    const config = getRegisteredHandler()({
      url: "/api/v1/shared/auth/refresh",
      headers: { Authorization: null },
    });

    expect(config.headers.Authorization).toBeNull();
  });
});

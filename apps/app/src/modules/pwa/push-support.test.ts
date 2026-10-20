import { describe, expect, it } from "vitest";
import { base64UrlToBytes } from "./service-worker";
import { getPushSupport } from "./push-support";

const fakeWindow = ({
  userAgent = "Mozilla/5.0 (Windows NT 10.0) Chrome/130",
  standalone = false,
  push = true,
  permission = "default",
}: {
  userAgent?: string;
  standalone?: boolean;
  push?: boolean;
  permission?: NotificationPermission;
}) =>
  ({
    navigator: {
      userAgent,
      platform: "Win32",
      maxTouchPoints: 0,
      ...(push ? { serviceWorker: {} } : {}),
    },
    matchMedia: () => ({ matches: standalone }),
    ...(push ? { PushManager: {}, Notification: { permission } } : {}),
  }) as unknown as Window;

const iphone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1";

describe("getPushSupport", () => {
  it("is ready in a desktop browser with push", () => {
    expect(getPushSupport(fakeWindow({}))).toBe("ready");
  });

  it("needs the Home Screen app on iPhone Safari", () => {
    expect(getPushSupport(fakeWindow({ userAgent: iphone, push: false }))).toBe(
      "needs-install",
    );
  });

  it("is ready in the installed iPhone app", () => {
    expect(
      getPushSupport(fakeWindow({ userAgent: iphone, standalone: true })),
    ).toBe("ready");
  });

  it("reports a blocked permission", () => {
    expect(getPushSupport(fakeWindow({ permission: "denied" }))).toBe("denied");
  });

  it("reports a browser without push", () => {
    expect(getPushSupport(fakeWindow({ push: false }))).toBe("unsupported");
  });
});

describe("base64UrlToBytes", () => {
  it("decodes an unpadded base64url VAPID key", () => {
    expect(Array.from(base64UrlToBytes("BP-_"))).toEqual([4, 255, 191]);
  });
});

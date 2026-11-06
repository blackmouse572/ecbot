import { describe, expect, it, vi } from "vitest";
import { analytics, canBoot, createAnalytics } from "./analytics";
import type { AnalyticsAdapter } from "./analytics-adapter";
import pkg from "../../package.json";

type Mocked = { [K in keyof AnalyticsAdapter]: ReturnType<typeof vi.fn> };
const adapter = (): Mocked =>
  ({
    boot: vi.fn(),
    identify: vi.fn(),
    group: vi.fn(),
    reset: vi.fn(),
    capture: vi.fn(),
  }) as never;

describe("analytics seam", () => {
  it.each(["/widget/abc", "/widget", "/preview/tok", "/impersonate"])(
    "never boots on %s",
    (path) => {
      const a = adapter();
      const seam = createAnalytics(
        [a as unknown as AnalyticsAdapter],
        () => path,
        () => false,
      );
      expect(seam.boot()).toBe(false);
      seam.capture("playground_message_sent", { turn_index: 1 });
      expect(a.boot).not.toHaveBeenCalled();
      expect(a.capture).not.toHaveBeenCalled();
    },
  );

  it("never boots while impersonating", () => {
    const a = adapter();
    const seam = createAnalytics(
      [a as unknown as AnalyticsAdapter],
      () => "/shop/dashboard",
      () => true,
    );
    expect(seam.boot()).toBe(false);
    expect(a.boot).not.toHaveBeenCalled();
  });

  it("boots on the dashboard and forwards calls", () => {
    const a = adapter();
    const seam = createAnalytics(
      [a as unknown as AnalyticsAdapter],
      () => "/shop/dashboard",
      () => false,
    );
    expect(seam.boot()).toBe(true);
    seam.identify("user-1");
    seam.group("ws-1");
    seam.capture("channel_connect_started", { channel: "zalo_account" });
    seam.reset();
    expect(a.identify).toHaveBeenCalledWith("user-1");
    expect(a.group).toHaveBeenCalledWith("ws-1");
    expect(a.capture).toHaveBeenCalledWith("channel_connect_started", {
      channel: "zalo_account",
    });
    expect(a.reset).toHaveBeenCalled();
  });

  it("stops reporting once the tab moves to the widget or a preview", () => {
    let path = "/shop/dashboard";
    const a = adapter();
    const seam = createAnalytics(
      [a as unknown as AnalyticsAdapter],
      () => path,
      () => false,
    );
    seam.boot();
    path = "/preview/tok";
    seam.capture("playground_message_sent", { turn_index: 1 });
    expect(a.capture).not.toHaveBeenCalled();
  });

  it("does nothing before boot", () => {
    const a = adapter();
    const seam = createAnalytics(
      [a as unknown as AnalyticsAdapter],
      () => "/shop/dashboard",
      () => false,
    );
    seam.identify("user-1");
    seam.capture("knowledge_failed_seen", {});
    expect(a.identify).not.toHaveBeenCalled();
    expect(a.capture).not.toHaveBeenCalled();
  });

  it("keeps the page alive when an adapter throws", () => {
    const a = adapter();
    a.capture.mockImplementation(() => {
      throw new Error("down");
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const seam = createAnalytics(
      [a as unknown as AnalyticsAdapter],
      () => "/shop/dashboard",
      () => false,
    );
    seam.boot();
    expect(() =>
      seam.capture("playground_message_sent", { turn_index: 2 }),
    ).not.toThrow();
    warn.mockRestore();
  });

  it("canBoot allows ordinary dashboard paths", () => {
    expect(canBoot("/shop/conversations", false)).toBe(true);
    expect(canBoot("/login", false)).toBe(true);
  });
});

describe("open edition", () => {
  // With `src/ee/` absent the glob matches nothing, like under Vite.
  it("has no adapter, so boot is a no-op", () => {
    expect(analytics.boot()).toBe(false);
  });

  const VENDORS =
    /posthog|mixpanel|amplitude|segment\.(io|com)|@segment\/|heap(analytics)?\.io|hotjar|fullstory|logrocket/i;
  // Every source file outside src/ee, as text.
  const sources = import.meta.glob<string>(
    ["../**/*.{ts,tsx}", "!../ee/**", "!../**/*.test.{ts,tsx}"],
    { query: "?raw", import: "default", eager: true },
  );

  it("imports no analytics vendor outside src/ee", () => {
    expect(Object.keys(sources).length).toBeGreaterThan(100);
    const offenders = Object.entries(sources)
      .filter(([, text]) =>
        text
          .split("\n")
          .some(
            (line) => /\bfrom\s+["']|import\(/.test(line) && VENDORS.test(line),
          ),
      )
      .map(([file]) => file);
    expect(offenders).toEqual([]);
  });

  it("depends on no analytics vendor package", () => {
    const deps = Object.keys({
      ...pkg.dependencies,
      ...(pkg as { devDependencies?: Record<string, string> }).devDependencies,
    });
    expect(deps.filter((d) => VENDORS.test(d))).toEqual([]);
  });
});

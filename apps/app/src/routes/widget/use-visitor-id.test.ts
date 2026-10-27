import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useVisitorId } from "./use-visitor-id";

describe("useVisitorId", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps the same id across mounts", () => {
    const first = renderHook(() => useVisitorId("key-1")).result.current
      .visitorId;
    const second = renderHook(() => useVisitorId("key-1")).result.current
      .visitorId;
    expect(second).toBe(first);
  });

  it("resetVisitorId mints and stores a new id, so the next mount starts a new conversation", () => {
    const { result } = renderHook(() => useVisitorId("key-1"));
    const before = result.current.visitorId;

    act(() => result.current.resetVisitorId());

    expect(result.current.visitorId).not.toBe(before);
    const remount = renderHook(() => useVisitorId("key-1"));
    expect(remount.result.current.visitorId).toBe(result.current.visitorId);
  });
});

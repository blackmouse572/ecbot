import { describe, it, expect, vi } from "vitest";
import { ConversationDebounceDO } from "../src/conversation-do";

function mkState() {
  const store = new Map<string, unknown>();
  return {
    storage: {
      get: async (k: string) => store.get(k),
      put: async (k: string, v: unknown) => void store.set(k, v),
      deleteAll: async () => store.clear(),
      setAlarm: vi.fn(async () => {}),
    },
  };
}
describe("ConversationDebounceDO", () => {
  it("buffers text and (re)sets the alarm on schedule", async () => {
    const state = mkState();
    const sut = new ConversationDebounceDO(state as any);
    await sut.fetch(
      new Request("http://do/schedule", {
        method: "POST",
        body: JSON.stringify({
          conversationId: "c",
          senderId: "s",
          customerId: "cu",
          contactPointId: "cp",
          text: "hello",
        }),
      }),
    );
    expect(state.storage.setAlarm).toHaveBeenCalledOnce();
    expect(await state.storage.get("texts")).toEqual(["hello"]);
  });

  it("coalesces a burst into one buffer, alarm reset each time", async () => {
    const state = mkState();
    const sut = new ConversationDebounceDO(state as any);
    for (const t of ["a", "b", "c"]) {
      await sut.fetch(
        new Request("http://do/schedule", {
          method: "POST",
          body: JSON.stringify({
            conversationId: "c",
            senderId: "s",
            customerId: "cu",
            contactPointId: "cp",
            text: t,
          }),
        }),
      );
    }
    expect(await state.storage.get("texts")).toEqual(["a", "b", "c"]);
    expect(state.storage.setAlarm).toHaveBeenCalledTimes(3);
  });

  it("alarm posts the buffered texts to /poc/reply and clears state", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const state = mkState();
    await state.storage.put("texts", ["a", "b"]);
    await state.storage.put("meta", {
      conversationId: "c",
      senderId: "s",
      customerId: "cu",
      contactPointId: "cp",
    });
    const sut = new ConversationDebounceDO(state as any);
    await sut.alarm();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://nest/api/v1/system/poc/reply",
      expect.objectContaining({ method: "POST" }),
    );
    const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(sentBody).toMatchObject({ conversationId: "c", texts: ["a", "b"] });
    expect(await state.storage.get("texts")).toBeUndefined();
  });

  // apps/api finds the burst's rows by id; counting the last rows breaks
  // when another message is saved before the Turn reads them.
  it("carries the saved message ids of the burst to /poc/reply", async () => {
    const fetchMock = vi.fn(async () => new Response("ok", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const state = mkState();
    const sut = new ConversationDebounceDO(state as any);
    for (const [text, messageId] of [
      ["", "m-1"],
      ["hi", undefined],
      ["", "m-2"],
    ]) {
      await sut.fetch(
        new Request("http://do/schedule", {
          method: "POST",
          body: JSON.stringify({
            conversationId: "c",
            senderId: "s",
            customerId: "cu",
            contactPointId: "cp",
            text,
            messageId,
          }),
        }),
      );
    }
    await sut.alarm();
    const sentBody = JSON.parse((fetchMock.mock.calls[0][1] as any).body);
    expect(sentBody).toMatchObject({
      texts: ["", "hi", ""],
      messageIds: ["m-1", "m-2"],
    });
  });
});

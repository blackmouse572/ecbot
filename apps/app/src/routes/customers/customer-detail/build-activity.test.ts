import { describe, expect, it } from "vitest";
import { buildActivity } from "./build-activity";

const conversation = {
  id: "conv-1",
  createdAt: "2026-11-02T08:00:00Z",
  lastMessageAt: "2026-11-24T07:30:00Z",
} as A;
const order = {
  id: "ord-1",
  orderedAt: "2026-11-08T10:00:00Z",
  createdAt: "2026-11-08T10:05:00Z",
} as A;
const event = { id: "ev-1", createdAt: "2026-11-23T13:10:00Z" } as A;

describe("buildActivity", () => {
  it("merges messages, orders and label changes, newest first", () => {
    const items = buildActivity({
      conversations: [conversation],
      orders: [order],
      events: [event],
    });

    expect(items.map((i) => [i.kind, i.at])).toEqual([
      ["message", "2026-11-24T07:30:00Z"],
      ["marketing", "2026-11-23T13:10:00Z"],
      ["order", "2026-11-08T10:00:00Z"],
      ["message", "2026-11-02T08:00:00Z"],
    ]);
    expect(items.at(-1)).toMatchObject({ kind: "message", first: true });
  });

  it("shows a conversation with one message once", () => {
    const items = buildActivity({
      conversations: [
        { ...conversation, lastMessageAt: conversation.createdAt },
      ],
      orders: [],
      events: [],
    });

    expect(items).toHaveLength(1);
  });

  it("keeps only the kind a filter asks for", () => {
    const items = buildActivity(
      { conversations: [conversation], orders: [order], events: [event] },
      "order",
    );

    expect(items.map((i) => i.id)).toEqual(["ord-1"]);
  });
});

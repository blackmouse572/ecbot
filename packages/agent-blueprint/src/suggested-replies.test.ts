import { describe, expect, it } from "vitest";
import { suggestedReplies } from "./suggested-replies";
import { GOALS } from "./libraries";

describe("suggestedReplies", () => {
  it("turns the agent's first goals into what a customer would tap, in its language", () => {
    expect(
      suggestedReplies(
        {
          goals: [
            "book_appointments",
            "answer_questions",
            "promotions",
            "recommend",
          ],
        },
        "vi",
      ),
    ).toEqual([
      "Mình muốn đặt lịch",
      "Cho mình xem bảng giá",
      "Đang có khuyến mãi gì không?",
    ]);
    expect(suggestedReplies({ goals: ["take_orders"] }, "en")).toEqual([
      "I'd like to place an order",
    ]);
  });

  it("falls back to English for other languages", () => {
    expect(suggestedReplies({ goals: ["take_orders"] }, "th")).toEqual([
      "I'd like to place an order",
    ]);
  });

  it("gives nothing without a profile", () => {
    expect(suggestedReplies(undefined, "vi")).toEqual([]);
    expect(suggestedReplies(null, "vi")).toEqual([]);
  });

  it("skips goals a customer cannot ask for", () => {
    expect(
      suggestedReplies(
        { goals: ["capture_leads", "qualify_leads", "order_status"] },
        "vi",
      ),
    ).toEqual(["Kiểm tra đơn hàng giúp mình"]);
  });

  it("has a reply in both languages for every goal it covers", () => {
    for (const goal of GOALS) {
      const vi = suggestedReplies({ goals: [goal.id] }, "vi");
      const en = suggestedReplies({ goals: [goal.id] }, "en");
      expect(vi.length).toBe(en.length);
    }
  });
});

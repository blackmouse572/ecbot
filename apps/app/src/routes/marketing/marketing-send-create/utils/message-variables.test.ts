import { describe, expect, it } from "vitest";
import {
  matchVariables,
  toMessageDoc,
  toMessageText,
  typedVariable,
} from "./message-variables";

describe("message variables", () => {
  it("turns placeholders into chips and lines into paragraphs", () => {
    expect(toMessageDoc("Chào {name}\n\n{product} còn hàng")).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Chào " },
            { type: "variable", attrs: { key: "name" } },
          ],
        },
        { type: "paragraph", content: [] },
        {
          type: "paragraph",
          content: [
            { type: "variable", attrs: { key: "product" } },
            { type: "text", text: " còn hàng" },
          ],
        },
      ],
    });
  });

  it("gives back the same text", () => {
    const text = "Chào {name}, {product} vẫn còn.\n\nNhắn {tên} để đặt.";

    expect(toMessageText(toMessageDoc(text))).toBe(text);
  });

  it("finds the { being typed before the cursor", () => {
    expect(typedVariable("Chào {te")).toEqual({ query: "te", length: 3 });
    expect(typedVariable("Chào {")).toEqual({ query: "", length: 1 });
    expect(typedVariable("Chào {name} ")).toBeNull();
    expect(typedVariable("Chào bạn")).toBeNull();
  });

  it("suggests by key or by label, accents or not", () => {
    const label = (key: string) => (key === "name" ? "Tên khách" : "Sản phẩm");

    expect(matchVariables("", label)).toEqual(["name", "product"]);
    expect(matchVariables("ten", label)).toEqual(["name"]);
    expect(matchVariables("sản", label)).toEqual(["product"]);
    expect(matchVariables("pro", label)).toEqual(["product"]);
    expect(matchVariables("xyz", label)).toEqual([]);
  });
});

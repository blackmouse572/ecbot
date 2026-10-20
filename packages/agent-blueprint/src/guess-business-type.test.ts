import { describe, expect, it } from "vitest";
import { guessBusinessType } from "./guess-business-type";

// #256: a clear description must still pick the type when the model is down.
describe("guessBusinessType", () => {
  it.each([
    ["Quán cà phê ở Đà Nẵng, khách hay hỏi menu và đặt bàn", "restaurant"],
    ["A coffee shop in Da Nang, customers book tables", "restaurant"],
    ["Nhà hàng lẩu nướng ở quận 7", "restaurant"],
    ["Tiệm nail và spa gội đầu dưỡng sinh", "beauty"],
    ["Shop quần áo nữ bán online", "fashion"],
    ["Phòng khám nha khoa ở Hà Nội", "healthcare"],
    ["Trung tâm tiếng Anh cho trẻ em", "education"],
    ["Homestay ở Hội An, khách hỏi giá phòng", "hotel"],
    ["Phòng gym và lớp yoga", "fitness"],
  ])("%s", (text, type) => {
    expect(guessBusinessType(text)).toBe(type);
  });

  it("does not guess from a vague description", () => {
    expect(guessBusinessType("Mình muốn một trợ lý trả lời khách")).toBeNull();
  });

  it("does not guess when two kinds of business match", () => {
    expect(guessBusinessType("Spa kiêm quán cà phê")).toBeNull();
  });
});

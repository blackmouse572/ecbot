import { describe, expect, it } from "vitest";

import { fileNameFromUrl } from "./file-name";

describe("fileNameFromUrl", () => {
  it("takes the last path segment, decoded, without the query", () => {
    expect(
      fileNameFromUrl("https://cdn.example/k/b%E1%BA%A3ng-gi%C3%A1.pdf?v=2"),
    ).toBe("bảng-giá.pdf");
  });

  it("returns the input when it is not a URL", () => {
    expect(fileNameFromUrl("menu.pdf")).toBe("menu.pdf");
  });
});

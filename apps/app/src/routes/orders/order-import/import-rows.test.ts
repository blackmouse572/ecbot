import { describe, expect, it } from "vitest";
import {
  buildImportLines,
  chunkImportLines,
  guessMapping,
  summarizeImport,
} from "./import-rows";

describe("guessMapping", () => {
  it("guesses each field once from the header, accents or not", () => {
    expect(
      guessMapping([
        "Ma don",
        "Số điện thoại",
        "Ten khach",
        "San pham",
        "Danh muc",
        "SL",
        "Gia",
        "Ngay dat",
        "Ghi chu kho",
        "SDT 2",
      ]),
    ).toEqual([
      "code",
      "phone",
      "name",
      "item",
      "group",
      "quantity",
      "unitPrice",
      "orderedAt",
      null,
      null,
    ]);
  });
});

describe("buildImportLines", () => {
  it("fills the mapped fields, reads the status, and drops cancelled rows", () => {
    const { lines, cancelled } = buildImportLines(
      [
        ["SP-1", "0903", "Kem", "Chờ xác nhận", "x"],
        ["SP-2", "0904", "Serum", "Đã huỷ", ""],
        ["", "", "", "", ""],
        ["SP-3", "0905", "Toner", "Hoàn thành", ""],
      ],
      ["code", "phone", "item", "status", null],
    );

    expect(lines).toEqual([
      {
        line: 2,
        row: { code: "SP-1", phone: "0903", item: "Kem", status: "PENDING" },
      },
      {
        line: 5,
        row: {
          code: "SP-3",
          phone: "0905",
          item: "Toner",
          status: "CONFIRMED",
        },
      },
    ]);
    expect(cancelled).toEqual([3]);
  });
});

describe("chunkImportLines", () => {
  const line = (n: number, code: string, phone: string) => ({
    line: n,
    row: { code, phone, item: "x" },
  });

  it("keeps an order's rows and a customer's orders in one request", () => {
    const chunks = chunkImportLines(
      [
        line(2, "A", "0901"),
        line(3, "B", "0902"),
        line(4, "A", "0901"),
        line(5, "C", "+84 902"),
      ],
      2,
    );

    expect(chunks.map((chunk) => chunk.lines)).toEqual([
      [2, 4],
      [3, 5],
    ]);
  });
});

describe("summarizeImport", () => {
  it("adds the requests up and gives invalid rows their file line", () => {
    expect(
      summarizeImport(
        [
          {
            dryRun: true,
            orders: 2,
            skipped: 1,
            newCustomers: 1,
            newGroups: ["Tẩy trang"],
            invalidRows: [{ row: 2, reason: "missingPhone" }],
          },
          {
            dryRun: true,
            orders: 1,
            skipped: 0,
            newCustomers: 1,
            newGroups: ["tẩy trang", "Toner"],
            invalidRows: [],
          },
        ],
        [
          { rows: [], lines: [2, 7, 9] },
          { rows: [], lines: [4] },
        ],
        [3],
      ),
    ).toEqual({
      orders: 3,
      skipped: 1,
      newCustomers: 2,
      newGroups: ["Tẩy trang", "Toner"],
      invalidLines: [
        { line: 3, reason: "cancelled" },
        { line: 7, reason: "missingPhone" },
      ],
    });
  });
});

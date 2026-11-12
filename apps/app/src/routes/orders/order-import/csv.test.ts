import { describe, expect, it } from "vitest";
import { decodeCsv, parseCsv } from "./csv";

describe("parseCsv", () => {
  it("reads quoted cells with commas, quotes and line breaks", () => {
    expect(
      parseCsv(
        '﻿Ma don,San pham\r\nSP-1,"Kem ""SPF50"", 50ml"\r\nSP-2,"Dòng 1\nDòng 2"\r\n',
      ),
    ).toEqual([
      ["Ma don", "San pham"],
      ["SP-1", 'Kem "SPF50", 50ml'],
      ["SP-2", "Dòng 1\nDòng 2"],
    ]);
  });

  it("reads a semicolon file, as Excel saves it in Vietnamese", () => {
    expect(parseCsv("SDT;Gia\n0903412885;345.000,5\n")).toEqual([
      ["SDT", "Gia"],
      ["0903412885", "345.000,5"],
    ]);
  });

  it("leaves out blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n,\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("ignores delimiters inside quoted header cells", () => {
    expect(parseCsv('"Ma don";"Ten, khach"\n1;"A; B"\n')).toEqual([
      ["Ma don", "Ten, khach"],
      ["1", "A; B"],
    ]);
  });
});

describe("decodeCsv", () => {
  it("reads UTF-8, and falls back to Windows Vietnamese (cp1258)", () => {
    const utf8 = new TextEncoder().encode("Tên khách").buffer;
    // "Tên" as Excel saves it on a Vietnamese Windows: ê is one byte, 0xEA.
    const cp1258 = new Uint8Array([0x54, 0xea, 0x6e]).buffer;

    expect(decodeCsv(utf8)).toBe("Tên khách");
    expect(decodeCsv(cp1258)).toBe("Tên");
  });
});

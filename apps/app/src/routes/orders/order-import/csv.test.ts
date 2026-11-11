import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";

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
});

import { describe, expect, it } from "vitest";
import { ORDER_IMPORT_FIELDS } from "../constants";
import { parseCsv } from "./csv";
import { buildImportLines, guessMapping } from "./import-rows";
import { importTemplate } from "./import-template";

describe("importTemplate", () => {
  it.each(["vi", "en"])(
    "in %s, Ecbot matches every column of its own template",
    (language) => {
      const [headers = [], ...records] = parseCsv(
        importTemplate(language).csv.replace(/^﻿/, ""),
      );
      const mapping = guessMapping(headers);

      expect(mapping).toEqual([...ORDER_IMPORT_FIELDS]);

      const { lines, cancelled } = buildImportLines(records, mapping);

      expect(cancelled).toEqual([]);
      expect(lines.map(({ row }) => [row.code, row.status])).toEqual([
        ["DH001", "CONFIRMED"],
        ["DH001", "CONFIRMED"],
        ["DH002", "PENDING"],
      ]);
    },
  );

  it("starts with a byte order mark so Excel reads the accents", () => {
    expect(importTemplate("vi").csv.startsWith("﻿")).toBe(true);
  });

  it("falls back to English for other languages", () => {
    expect(importTemplate("fr").filename).toBe(importTemplate("en").filename);
  });
});

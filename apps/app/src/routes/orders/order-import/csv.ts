/**
 * The file's text: UTF-8 (with or without BOM), or else Windows Vietnamese
 * (cp1258), which Excel uses for a plain "CSV (Comma delimited)" there.
 */
export const decodeCsv = (buffer: ArrayBuffer) => {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1258").decode(buffer);
  }
};

const DELIMITERS = [",", ";", "\t"];

/**
 * The delimiter used most on the header line, outside quoted cells: Excel in
 * Vietnamese saves ";".
 */
const detectDelimiter = (text: string) => {
  const header = text
    .slice(0, text.search(/\r?\n|$/))
    .replace(/"(?:[^"]|"")*"/g, "");

  return DELIMITERS.reduce((best, delimiter) =>
    header.split(delimiter).length > header.split(best).length
      ? delimiter
      : best,
  );
};

/**
 * Parse CSV text into rows of cells (RFC 4180: quoted cells may hold the
 * delimiter, doubled quotes and line breaks). Blank lines are left out.
 */
export const parseCsv = (input: string): string[][] => {
  const text = input.replace(/^﻿/, "");
  const delimiter = detectDelimiter(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  const endRow = () => {
    row.push(cell);

    if (row.some((value) => value.trim() !== "")) {
      rows.push(row);
    }

    row = [];
    cell = "";
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      endRow();
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell !== "" || row.length) {
    endRow();
  }

  return rows;
};

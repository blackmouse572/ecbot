import { ORDER_IMPORT_TEMPLATES } from "../constants";

/** A cell as CSV writes it: quoted when it holds a comma, quote or newline. */
const cell = (value: string) =>
  /[",\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;

/**
 * The sample import file in the shop's language (English otherwise). It
 * starts with a byte order mark so Excel opens the accents as UTF-8.
 */
export const importTemplate = (language: string) => {
  const template = language.startsWith("vi")
    ? ORDER_IMPORT_TEMPLATES.vi
    : ORDER_IMPORT_TEMPLATES.en;

  const csv = [template.headers, ...template.rows]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");

  return { filename: template.filename, csv: `﻿${csv}\r\n` };
};

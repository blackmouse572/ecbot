import type {
  OrderImportResponseDto,
  OrderImportRowRequestDto,
} from "@/hooks/api/orders";
import {
  ORDER_IMPORT_FIELDS,
  ORDER_IMPORT_HEADER_ALIASES,
  ORDER_IMPORT_MAX_ROWS,
} from "../constants";
import type {
  OrderImportChunk,
  OrderImportField,
  OrderImportLine,
  OrderImportMapping,
  OrderImportSummary,
} from "../types";

/** Lower case, no accents, single spaces: "Số  ĐT" becomes "so dt". */
const plain = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** The field each header fills: exact names first, then a name it starts with. */
export const guessMapping = (headers: string[]): OrderImportMapping => {
  const names = headers.map(plain);
  const mapping: OrderImportMapping = headers.map(() => null);
  const used = new Set<OrderImportField>();

  const pass = (matches: (name: string, alias: string) => boolean) =>
    names.forEach((name, column) => {
      if (mapping[column]) {
        return;
      }

      const field = ORDER_IMPORT_FIELDS.find(
        (candidate) =>
          !used.has(candidate) &&
          ORDER_IMPORT_HEADER_ALIASES[candidate].some((alias) =>
            matches(name, alias),
          ),
      );

      if (field) {
        mapping[column] = field;
        used.add(field);
      }
    });

  pass((name, alias) => name === alias);
  pass((name, alias) => name.startsWith(`${alias} `));

  return mapping;
};

const CANCELLED = /\b(huy|cancel\w*|tra hang|hoan hang|returned)\b/;
const PENDING = /\b(cho|chua|pending|unconfirmed)\b/;

/**
 * The rows to send, each with its line in the file (the header is line 1).
 * Blank rows are left out, and so are cancelled orders: an import only adds
 * confirmed or pending ones.
 */
export const buildImportLines = (
  records: string[][],
  mapping: OrderImportMapping,
) => {
  const lines: OrderImportLine[] = [];
  const cancelled: number[] = [];

  records.forEach((cells, index) => {
    const line = index + 2;
    const row: OrderImportRowRequestDto = {};
    let isCancelled = false;

    mapping.forEach((field, column) => {
      const value = cells[column]?.trim();

      if (!field || !value) {
        return;
      }

      if (field === "status") {
        const status = plain(value);

        isCancelled = CANCELLED.test(status);
        row.status = PENDING.test(status) ? "PENDING" : "CONFIRMED";

        return;
      }

      row[field] = value;
    });

    if (isCancelled) {
      cancelled.push(line);
    } else if (Object.keys(row).length) {
      lines.push({ line, row });
    }
  });

  return { lines, cancelled };
};

/** The API's phoneKey: digits, without the 84 or 0 in front. */
const phoneKey = (phone: string) => {
  const digits = phone.replace(/\D/g, "");

  return digits.startsWith("84") && digits.length >= 11
    ? digits.slice(2)
    : digits.replace(/^0/, "");
};

/**
 * Split the rows into requests of at most `max` rows. Rows of one order
 * (same code) and orders of one customer (same phone) stay in one request,
 * so the preview counts a new customer once and an order is never split.
 */
export const chunkImportLines = (
  lines: OrderImportLine[],
  max: number = ORDER_IMPORT_MAX_ROWS,
): OrderImportChunk[] => {
  const parent = lines.map((_, index) => index);

  const find = (index: number): number =>
    parent[index] === index ? index : (parent[index] = find(parent[index]));

  const firstOf = new Map<string, number>();

  lines.forEach(({ row }, index) => {
    const code = row.code?.trim();
    const phone = row.phone ? phoneKey(row.phone) : "";

    for (const key of [code && `code:${code}`, phone && `phone:${phone}`]) {
      if (!key) {
        continue;
      }

      const first = firstOf.get(key);

      if (first === undefined) {
        firstOf.set(key, index);
      } else {
        parent[find(index)] = find(first);
      }
    }
  });

  const groups = new Map<number, number[]>();

  lines.forEach((_, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), index]);
  });

  const chunks: number[][] = [];
  let current: number[] = [];

  const add = (piece: number[]) => {
    if (current.length + piece.length > max && current.length) {
      chunks.push(current);
      current = [];
    }

    current.push(...piece);
  };

  for (const group of groups.values()) {
    // A customer with more rows than a request holds: split by order.
    for (const piece of group.length > max ? byOrder(lines, group) : [group]) {
      for (let start = 0; start < piece.length; start += max) {
        add(piece.slice(start, start + max));
      }
    }
  }

  if (current.length) {
    chunks.push(current);
  }

  return chunks.map((indexes) => {
    const sorted = [...indexes].sort((a, b) => a - b);

    return {
      rows: sorted.map((index) => lines[index].row),
      lines: sorted.map((index) => lines[index].line),
    };
  });
};

const byOrder = (lines: OrderImportLine[], group: number[]) => {
  const orders = new Map<string, number[]>();

  for (const index of group) {
    const key = lines[index].row.code?.trim() || `#${index}`;
    orders.set(key, [...(orders.get(key) ?? []), index]);
  }

  return [...orders.values()];
};

/** Add up one result per request, with invalid rows at their file line. */
export const summarizeImport = (
  results: OrderImportResponseDto[],
  chunks: OrderImportChunk[],
  cancelled: number[],
): OrderImportSummary => {
  const newGroups = new Map<string, string>();

  for (const name of results.flatMap((result) => result.newGroups)) {
    const key = name.toLocaleLowerCase("vi");

    if (!newGroups.has(key)) {
      newGroups.set(key, name);
    }
  }

  const invalidLines: OrderImportSummary["invalidLines"] = [
    ...cancelled.map((line) => ({ line, reason: "cancelled" as const })),
    ...results.flatMap((result, index) =>
      result.invalidRows.map(({ row, reason }) => ({
        line: chunks[index].lines[row - 1],
        reason,
      })),
    ),
  ].sort((a, b) => a.line - b.line);

  const sum = (key: "orders" | "skipped" | "newCustomers") =>
    results.reduce((total, result) => total + result[key], 0);

  return {
    orders: sum("orders"),
    skipped: sum("skipped"),
    newCustomers: sum("newCustomers"),
    newGroups: [...newGroups.values()],
    invalidLines,
  };
};

import type { OrderImportRowRequestDto } from "@/hooks/api/orders";
import type { ORDER_IMPORT_FIELDS } from "./constants";

export type OrderImportField = (typeof ORDER_IMPORT_FIELDS)[number];

/** The field each file column fills, by column index; null skips the column. */
export type OrderImportMapping = (OrderImportField | null)[];

/** A row the server checks, with its line in the file (the header is line 1). */
export interface OrderImportLine {
  row: OrderImportRowRequestDto;
  line: number;
}

/** One request's rows, and the file line of each. */
export interface OrderImportChunk {
  rows: OrderImportRowRequestDto[];
  lines: number[];
}

export type OrderImportReason =
  | "missingPhone"
  | "badDate"
  | "badNumber"
  | "empty"
  | "customerLimit"
  | "failed"
  | "cancelled";

/** What a file adds up to across its requests. */
export interface OrderImportSummary {
  orders: number;
  skipped: number;
  newCustomers: number;
  newGroups: string[];
  invalidLines: { line: number; reason: OrderImportReason }[];
}

/** A CSV file read in the browser: its header row and the rows under it. */
export interface OrderImportFile {
  name: string;
  headers: string[];
  records: string[][];
}

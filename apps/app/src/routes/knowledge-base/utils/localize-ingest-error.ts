import type { TFunction } from "i18next";
import { KB_INGEST_ERROR_KEYS } from "../constants";

/** A failed item's error in the owner's language when it is a known one (#165). */
export function localizeIngestError(message: string, t: TFunction): string {
  const key = KB_INGEST_ERROR_KEYS[message];
  return key ? t(key) : message;
}

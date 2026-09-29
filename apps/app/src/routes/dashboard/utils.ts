import type { CountQuery } from "./types";

/** A stat's value: the count, or "-" while it loads or after it fails. */
export const countValue = ({ count, isLoading, isError }: CountQuery) =>
  isLoading || isError ? "-" : count;

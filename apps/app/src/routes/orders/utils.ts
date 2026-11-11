import type { OrderGetResponseDto } from "@/hooks/api/orders";
import type { OrderFormData } from "./schemas";

/** "780.000 ₫" in Vietnamese, "₫780,000" in English. */
export const formatMoney = (amount: number, currency: string, locale: string) =>
  new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);

/** "345.000" while typing an amount, grouped the way the language writes it. */
export const formatAmountInput = (amount: number | null, locale: string) =>
  amount === null ? "" : new Intl.NumberFormat(locale).format(amount);

/** Whole amounts only: "345.000", "345,000" and "345000đ" are all 345000. */
export const parseAmountInput = (text: string): number | null => {
  const digits = text.replace(/\D/g, "");

  return digits ? Number(digits) : null;
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export type OrderedAt =
  | { when: "today" | "yesterday"; time: string }
  | { when: "earlier"; date: string };

/** Today and yesterday with the time, older days as 8/11, older years with the year. */
export const orderedAtLabel = (
  value: string,
  locale: string,
  now = new Date(),
): OrderedAt => {
  const date = new Date(value);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  if (sameDay(date, now)) return { when: "today", time };

  if (sameDay(date, yesterday)) return { when: "yesterday", time };

  return {
    when: "earlier",
    date: new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "numeric",
      ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
    }).format(date),
  };
};

/** "11/11/2026, 14:12": the date first in every language, as shops write it. */
export const formatOrderedAt = (value: string, locale: string) => {
  const date = new Date(value);

  const day = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);

  const time = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${day}, ${time}`;
};

/** The order's group names, each once, in item order. */
export const orderGroupNames = (order: Pick<OrderGetResponseDto, "items">) => [
  ...new Set(
    order.items.flatMap((item) =>
      item.productGroupName ? [item.productGroupName] : [],
    ),
  ),
];

export const emptyOrderItem = (): OrderFormData["items"][number] => ({
  name: "",
  group: null,
  quantity: 1,
  unitPrice: null,
});

/** The items' sum, the total an order has unless the shop typed another. */
export const itemsTotal = (items: OrderFormData["items"]) =>
  items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * item.quantity, 0);

const pad = (value: number) => String(value).padStart(2, "0");

/** "14:05", what a time input holds. */
export const timeOf = (date: Date) =>
  `${pad(date.getHours())}:${pad(date.getMinutes())}`;

/** The picked day, keeping the time already set. */
export const withDay = (current: Date, day: Date) => {
  const next = new Date(day);
  next.setHours(current.getHours(), current.getMinutes(), 0, 0);

  return next;
};

/** The same day at "HH:mm". */
export const withTime = (current: Date, time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  const next = new Date(current);
  next.setHours(hours, minutes, 0, 0);

  return next;
};

/** "Kem chống nắng × 2, Serum C × 1": an order's items on one line. */
export const itemsSummary = (order: Pick<OrderGetResponseDto, "items">) =>
  order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ");

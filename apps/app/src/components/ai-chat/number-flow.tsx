import { clx } from "@medusajs/ui";
import type { FC } from "react";

type Props = {
  value: string;
  className?: string;
};

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Shows `value` with each digit as a 0-9 column that rolls to its place
 * (NumberFlow-style). Characters are keyed by their position from the right,
 * so the units stay mounted and roll, while a new leading digit fades in.
 * Tabular figures keep the width steady as the number changes.
 */
export const NumberFlow: FC<Props> = ({ value, className }) => {
  const chars = [...value];
  return (
    <span
      className={clx("inline-flex whitespace-nowrap tabular-nums", className)}
    >
      <span className="sr-only">{value}</span>
      {chars.map((char, index) => {
        const fromRight = chars.length - index;
        if (!/\d/.test(char)) {
          return (
            <span
              key={`s${fromRight}${char}`}
              aria-hidden
              className="leading-[1.25em]"
            >
              {char}
            </span>
          );
        }
        return (
          <span
            key={`d${fromRight}`}
            aria-hidden
            className="inline-block h-[1.25em] overflow-hidden leading-[1.25em] transition-opacity duration-200 ease-out mask-y-from-75% starting:opacity-0"
          >
            <span
              className="flex flex-col transition-transform duration-300 ease-out motion-reduce:transition-none"
              // The roll offset is data, not styling: one tenth of the column per digit.
              style={{ transform: `translateY(-${Number(char) * 10}%)` }}
            >
              {DIGITS.map((d) => (
                <span key={d} className="h-[1.25em] text-center">
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};

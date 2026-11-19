import type { FC } from "react";
import { PlatformIcon, type AccountType } from "./platform-icon";

const MAX_MARKS = 4;

type Props = {
  /** One mark per entry, in order; repeats show twice. */
  types: AccountType[];
};

/** Platform marks overlapped in a row, with "+N" past four. */
export const PlatformIconStack: FC<Props> = ({ types }) => {
  const shown = types.slice(0, MAX_MARKS);
  const hidden = types.length - shown.length;

  return (
    <div className="flex shrink-0 items-center -space-x-1.5">
      {shown.map((type, i) => (
        <PlatformIcon
          key={`${type}-${i}`}
          type={type}
          size={20}
          className="ring-ui-bg-base shrink-0 ring-2"
        />
      ))}
      {hidden > 0 && (
        <span className="bg-ui-bg-subtle text-ui-fg-subtle ring-ui-bg-base flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[10px] leading-none ring-2">
          +{hidden}
        </span>
      )}
    </div>
  );
};

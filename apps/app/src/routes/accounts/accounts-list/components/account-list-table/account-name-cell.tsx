import { Text, clx } from "@medusajs/ui";
import type { AccountListResponseDto } from "@repo/client";
import type { HTMLAttributes } from "react";
import {
  PlatformIcon,
  type AccountType,
} from "../../../../../components/platform-icon/platform-icon";

export type AccountNameCellProps = HTMLAttributes<HTMLDivElement> &
  Pick<AccountListResponseDto, "name"> & {
    type?: AccountType;
    /** Optional second line under the name, e.g. the platform handle. */
    subtitle?: string;
    /** Platform icon edge length in px. */
    size?: number;
  };

/** One line of the cell: the account name, or the muted subtitle below it. */
const Line = ({ text, muted }: { text: string; muted?: boolean }) => (
  <Text size="xsmall" className={clx(muted && "text-ui-fg-muted", "truncate")}>
    {text}
  </Text>
);

/** Identity cell for an account: platform mark beside the account name. */
export const AccountNameCell = ({
  type,
  name,
  subtitle,
  className,
  size = 24,
  ...divProps
}: AccountNameCellProps) => (
  <div {...divProps} className={clx("flex items-center gap-2", className)}>
    <PlatformIcon size={size} type={type} />
    <div className="w-full flex-1 min-w-0">
      <Line text={name} />
      {subtitle && <Line text={subtitle} muted />}
    </div>
  </div>
);

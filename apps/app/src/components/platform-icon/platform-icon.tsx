import { clx } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";
import type { ComponentProps } from "react";
import { channelOf } from "./channel-catalog";

export type AccountType = AccountGetDetailResponseDto["type"];

interface PlatformIconProps extends Omit<ComponentProps<"img">, "src" | "alt"> {
  type?: AccountType | null;
  size?: number; // px, default 14
}

export const PlatformIcon = ({
  type,
  size = 14,
  className,
  style,
  ...rest
}: PlatformIconProps) => {
  if (!type) return null;
  const channel = channelOf(type);
  return (
    <img
      src={channel.icon}
      alt={channel.label}
      title={channel.label}
      width={size}
      height={size}
      className={clx("bg-ui-bg-base rounded-full", className)}
      style={{ width: size, height: size, ...style }}
      {...rest}
    />
  );
};

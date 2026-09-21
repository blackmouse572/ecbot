import { StatusBadge } from "@medusajs/ui";
import type { UserProfileResponseDto } from "@repo/client";
import { useMemo } from "react";

export function UserStatusBadge({
  status,
  children,
}: {
  status: UserProfileResponseDto["status"];
  children?: React.ReactNode;
}) {
  const color = useMemo(() => {
    switch (status) {
      case "ACTIVE":
        return "green";
      case "BLOCKED":
        return "red";
      default:
        return "grey";
    }
  }, [status]);

  return <StatusBadge color={color}>{children}</StatusBadge>;
}

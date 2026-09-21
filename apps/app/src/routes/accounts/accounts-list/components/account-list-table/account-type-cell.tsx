import { Badge } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";

type AccountTypeCellProps = Pick<AccountGetDetailResponseDto, "type"> &
  React.ComponentPropsWithoutRef<typeof Badge>;
export const AccountTypeCell = ({ type, ...props }: AccountTypeCellProps) => {
  return (
    <Badge color={colorMap[type]} {...props}>
      {type}
    </Badge>
  );
};

const colorMap: Record<
  AccountTypeCellProps["type"],
  AccountTypeCellProps["color"]
> = {
  FACEBOOK_ACCOUNT: "blue",
  FACEBOOK_PAGE: "purple",
  INSTAGRAM_PAGE: "blue",
  INSTAGRAM_ACCOUNT: "orange",
  ZALO_ACCOUNT: "blue",
  ZALO_PAGE: "red",
  TIKTOK_SHOP: "grey",
  SHOPEE_SHOP: "orange",
  TELEGRAM_BOT: "blue",
  API_CHANNEL: "grey",
  WEBSITE_WIDGET: "green",
};

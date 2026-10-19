import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { PlusMini } from "@medusajs/icons";
import { Button } from "@medusajs/ui";
import type { ComponentProps, FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type ConnectChannelButtonProps = Pick<
  ComponentProps<typeof Button>,
  "size" | "variant"
>;

/** Opens the connect-channel page of the current workspace. */
export const ConnectChannelButton: FC<ConnectChannelButtonProps> = ({
  size = "small",
  variant = "secondary",
}) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();

  return (
    <Button size={size} variant={variant} asChild>
      <Link to={`/${workspaceSlug}/${ROUTES.Accounts}/create`}>
        <PlusMini />
        {t("actions.connectChannel")}
      </Link>
    </Button>
  );
};

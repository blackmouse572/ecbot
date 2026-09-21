import { Spinner } from "@medusajs/icons";
import { clx } from "@medusajs/ui";
import React from "react";
import { LogoBox } from "../logo-box/logo-box";

type LogoBoxProps = {
  className?: string;
  logo?: React.ReactNode;
};

export const LogoBoxSpinner = ({ className, logo }: LogoBoxProps) => {
  return (
    <div
      className={clx(
        "flex-1 flex flex-col min-h-screen items-center justify-center gap-4",
        className,
      )}
    >
      <div>{logo || <LogoBox />}</div>
      <Spinner className="animate-spin" />
    </div>
  );
};

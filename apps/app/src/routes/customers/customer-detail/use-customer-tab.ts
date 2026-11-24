import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CUSTOMER_DETAIL_TABS } from "./constants";
import type { CustomerDetailTab } from "./types";

const isTab = (value: string | null): value is CustomerDetailTab =>
  CUSTOMER_DETAIL_TABS.some((tab) => tab === value);

/**
 * The open tab. It lives in state so it survives the edit drawer, and
 * follows `?tab=` when a link sets it. Tổng quan carries no `?tab=`.
 */
export const useCustomerTab = () => {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get("tab");
  const [tab, setTab] = useState<CustomerDetailTab>(
    isTab(fromUrl) ? fromUrl : "overview",
  );

  useEffect(() => {
    if (isTab(fromUrl)) setTab(fromUrl);
  }, [fromUrl]);

  const open = (value: string) => {
    if (!isTab(value)) return;
    setTab(value);
    setParams(
      (prev) => {
        if (value === "overview") prev.delete("tab");
        else prev.set("tab", value);

        return prev;
      },
      { replace: true },
    );
  };

  return [tab, open] as const;
};

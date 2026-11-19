import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CHATBOT_DETAIL_TABS, type ChatbotDetailTab } from "../../constants";

const isTab = (value: string | null): value is ChatbotDetailTab =>
  CHATBOT_DETAIL_TABS.some((tab) => tab === value);

/**
 * The open tab. It lives in state so it survives an edit drawer's route
 * (which drops the query), and follows `?tab=` when a link sets it. The
 * overview is the default, so its link carries no `?tab=`.
 */
export const useDetailTab = () => {
  const [params, setParams] = useSearchParams();
  const fromUrl = params.get("tab");

  const [tab, setTab] = useState<ChatbotDetailTab>(
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

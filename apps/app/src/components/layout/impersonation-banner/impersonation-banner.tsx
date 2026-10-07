import { ArrowRightOnRectangle, Eye, Minus } from "@medusajs/icons";
import { clx, IconButton } from "@medusajs/ui";
import { useTranslation } from "react-i18next";

import {
  useEndImpersonation,
  useImpersonation,
  useImpersonationRefresh,
} from "@/modules/impersonation";

import { useBannerUi } from "./use-banner-drag";

const SHELL =
  "fixed left-1/2 top-[9px] z-[60] flex items-center gap-x-2 rounded-lg border px-2.5 py-1.5 " +
  "text-[12px] font-semibold shadow-lg select-none touch-none";
const PALETTE = "border-[#6f5223] bg-[#2b1d0c] text-[#ffd9a3]";

const ICON_BUTTON =
  "!size-6 !rounded-md !border-0 !bg-transparent !shadow-none text-[#ffcf8c] " +
  "hover:!bg-[#4a3413] active:!bg-[#5a4018] focus-visible:!shadow-none";

export function ImpersonationBanner() {
  const impersonation = useImpersonation();
  const endImpersonation = useEndImpersonation();
  const { t } = useTranslation();
  const { x, minimized, setMinimized, consumeDrag, dragHandlers } =
    useBannerUi();
  // Renews the impersonation token in the background (like a normal login), so
  // there is nothing to count down: the session lasts until the operator exits.
  useImpersonationRefresh();

  if (!impersonation) return null;

  const style = { transform: `translateX(calc(-50% + ${x}px))` };

  if (minimized) {
    return (
      <button
        type="button"
        aria-label={t("impersonation.banner.expand")}
        title={t("impersonation.banner.expand")}
        className={clx(SHELL, PALETTE, "rounded-full")}
        style={style}
        onClick={(e) => {
          e.stopPropagation();
          // A drag ends with a click on the pill: don't treat it as expand.
          if (consumeDrag()) return;
          setMinimized(false);
        }}
        onPointerDown={dragHandlers.onPointerDown}
        onPointerMove={dragHandlers.onPointerMove}
        onPointerUp={dragHandlers.onPointerUp}
      >
        <Eye className="size-4 text-[#ffb454]" />
      </button>
    );
  }

  return (
    <div
      className={clx(SHELL, PALETTE)}
      style={style}
      {...dragHandlers}
      role="region"
      aria-label={t("impersonation.banner.label")}
    >
      <span className="cursor-grab text-[#8a672f]">⠿</span>
      <span className="size-1.5 rounded-full bg-[#ff9d1e]" />
      <span className="text-[#ffb454]">{t("impersonation.banner.label")}</span>
      <span className="font-normal text-[#ffe9cf]">
        {impersonation.user.name} · {impersonation.user.email}
      </span>
      <IconButton
        type="button"
        size="2xsmall"
        variant="transparent"
        aria-label={t("impersonation.banner.exit")}
        title={t("impersonation.banner.exit")}
        className={ICON_BUTTON}
        onClick={(e) => {
          e.stopPropagation();
          void endImpersonation("manual");
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ArrowRightOnRectangle />
      </IconButton>
      <IconButton
        type="button"
        size="2xsmall"
        variant="transparent"
        aria-label={t("impersonation.banner.minimize")}
        title={t("impersonation.banner.minimize")}
        className={ICON_BUTTON}
        onClick={(e) => {
          e.stopPropagation();
          setMinimized(true);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Minus />
      </IconButton>
    </div>
  );
}

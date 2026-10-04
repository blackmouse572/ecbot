import { clx } from "@medusajs/ui";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { useEndImpersonation, useImpersonation } from "@/modules/impersonation";

import { useBannerUi } from "./use-banner-drag";
import { useCountdown } from "./use-countdown";

const SHELL =
  "fixed left-1/2 top-[9px] z-[60] flex items-center gap-x-2 rounded-lg border px-2.5 py-1.5 " +
  "text-[12px] font-semibold shadow-lg select-none touch-none";
const PALETTE = "border-[#6f5223] bg-[#2b1d0c] text-[#ffd9a3]";

export function ImpersonationBanner() {
  const impersonation = useImpersonation();
  const endImpersonation = useEndImpersonation();
  const { t } = useTranslation();
  const { x, minimized, setMinimized, consumeDrag, dragHandlers } = useBannerUi();
  const { ms, label, expired, ending } = useCountdown(impersonation?.expiresAt ?? 0);

  const endedRef = useRef(false);
  useEffect(() => {
    if (impersonation && ending && !endedRef.current) {
      endedRef.current = true;
      void endImpersonation("expired");
    }
  }, [impersonation, ending, endImpersonation]);

  if (!impersonation) return null;

  const style = { transform: `translateX(calc(-50% + ${x}px))` };
  const lowTime = ms > 0 && ms < 60_000;

  if (minimized) {
    return (
      <button
        type="button"
        aria-label={t("impersonation.banner.expand")}
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
        <span className="size-1.5 rounded-full bg-[#ff9d1e]" />
        <span className="tabular-nums">{label}</span>
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
      <span className="text-[#6f5223]">·</span>
      <span
        className={clx(
          "tabular-nums",
          lowTime || expired ? "text-red-400" : "text-[#ffcf8c]",
        )}
      >
        {t("impersonation.banner.endsIn", { time: label })}
      </span>
      <button
        type="button"
        className="rounded bg-[#ffb020] px-2 py-0.5 font-bold text-[#2b1d0c]"
        onClick={(e) => {
          e.stopPropagation();
          void endImpersonation("manual");
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {t("impersonation.banner.exit")}
      </button>
      <button
        type="button"
        aria-label={t("impersonation.banner.minimize")}
        className="px-1 text-[#c79350]"
        onClick={(e) => {
          e.stopPropagation();
          setMinimized(true);
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        ▁
      </button>
    </div>
  );
}

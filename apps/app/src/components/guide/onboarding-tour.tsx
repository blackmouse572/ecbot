import { toast } from "@medusajs/ui";
import { driver, type PopoverDOM } from "driver.js";
import "driver.js/dist/driver.css";
import { useEffect, type FC } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useTranslation } from "react-i18next";
import { TOUR_STEPS } from "./constants";
import { FeatureArt } from "./feature-art";
import "./onboarding-tour.css";

interface OnboardingTourProps {
  onClose: () => void;
}

// The sidebar link of a step's page, when a sidebar is on screen. The
// desktop sidebar stays in the DOM, hidden, while the mobile sheet is open.
// Without one (a phone with the sheet closed) the card sits mid-screen.
const findTarget = (route: string) =>
  [
    ...document.querySelectorAll<HTMLElement>(`aside a[href$="/${route}"]`),
  ].find((link) => link.getBoundingClientRect().width > 0);

/**
 * Three cards after the first agent goes live, each pointing at the sidebar
 * link of a page the owner needs next. driver.js draws the spotlight, the
 * arrow and the buttons; onboarding-tour.css styles them with ecbot tokens.
 */
export const OnboardingTour: FC<OnboardingTourProps> = ({ onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    let art: Root | undefined;
    let closed = false;

    // Each card opens with the feature's scene, rendered by React into the
    // popover driver.js builds.
    const renderArt = (popover: PopoverDOM, index: number) => {
      const step = TOUR_STEPS[index];
      const Icon = step.icon;
      art?.unmount();
      const container = document.createElement("div");
      container.className = "ecbot-tour-art";
      popover.wrapper.prepend(container);
      art = createRoot(container);
      art.render(
        <FeatureArt
          feature={step.feature}
          icon={<Icon />}
          className="max-w-none rounded-none"
        />,
      );

      popover.progress.setAttribute("role", "img");
      popover.progress.setAttribute(
        "aria-label",
        t("guide.tour.progress", {
          current: index + 1,
          total: TOUR_STEPS.length,
        }),
      );
      popover.progress.replaceChildren(
        ...TOUR_STEPS.map((_, i) => {
          const dot = document.createElement("span");
          dot.className = i === index ? "is-active" : "";
          return dot;
        }),
      );
      // The X is the only way out; the first card has nowhere to go back.
      popover.closeButton.setAttribute("aria-label", t("guide.tour.skip"));
      popover.previousButton.hidden = index === 0;
    };

    const unmountArt = () => {
      const root = art;
      art = undefined;
      // Unmounting a root while React renders warns; defer it.
      queueMicrotask(() => root?.unmount());
    };

    // driver.js only reports a destroy it started itself, so the tour tells
    // the moment it closes and then tears the overlay down.
    const close = (finished: boolean) => {
      if (closed) return;
      closed = true;
      tour.destroy();
      unmountArt();
      previousFocus?.focus?.();
      onClose();
      toast.info(t(finished ? "guide.tour.finished" : "guide.tour.skipped"));
    };

    const tour = driver({
      popoverClass: "ecbot-tour",
      animate: !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
      overlayColor: "var(--bg-overlay)",
      overlayOpacity: 1,
      stagePadding: 4,
      stageRadius: 8,
      popoverOffset: 12,
      smoothScroll: true,
      overlayClickBehavior: () => {},
      showProgress: true,
      showButtons: ["next", "previous", "close"],
      nextBtnText: t("guide.tour.next"),
      prevBtnText: t("actions.back"),
      doneBtnText: t("guide.tour.done"),
      steps: TOUR_STEPS.map((step) => ({
        element: findTarget(step.route),
        popover: {
          title: t(`guide.features.${step.feature}.title`),
          description: t(`guide.features.${step.feature}.body`),
          side: "right",
          align: "center",
        },
      })),
      onPopoverRender: (popover, { state }) =>
        renderArt(popover, state.activeIndex ?? 0),
      onDoneClick: () => close(true),
      // The X and Escape both land here; Done has its own hook above.
      onDestroyStarted: () => close(false),
    });

    tour.drive();

    return () => {
      if (closed) return;
      closed = true;
      tour.destroy();
      unmountArt();
    };
  }, [onClose, t]);

  return null;
};

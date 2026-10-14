import { toast } from "@medusajs/ui";
import { driver, type Config, type Driver, type PopoverDOM } from "driver.js";
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

// How long the tour waits for the sidebar to slide in after the menu opens.
const MENU_WAIT_MS = 1000;
const MENU_POLL_MS = 50;

// The sidebar link of a step's page, when a sidebar is on screen. The
// desktop sidebar stays in the DOM, hidden, while the mobile sheet is open.
const findLink = (route: string) =>
  [
    ...document.querySelectorAll<HTMLElement>(`aside a[href$="/${route}"]`),
  ].find((link) => link.getBoundingClientRect().width > 0);

// The button that opens the sidebar when it is folded away (a phone, or a
// collapsed desktop sidebar).
const findMenuButton = () =>
  [...document.querySelectorAll<HTMLElement>("[data-sidebar-toggle]")].find(
    (button) => button.getBoundingClientRect().width > 0,
  );

/**
 * Three cards after the first agent goes live, each pointing at the sidebar
 * link of a page the owner needs next. With the sidebar folded away, a first
 * card points at the menu button and the tour goes on once the owner opens
 * it. driver.js draws the spotlight, the arrow and the buttons;
 * onboarding-tour.css styles them with ecbot tokens.
 */
export const OnboardingTour: FC<OnboardingTourProps> = ({ onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    let art: Root | undefined;
    let closed = false;
    let tour: Driver | undefined;
    // Set when the sidebar is folded away: the tour starts at its button.
    const menu = findLink(TOUR_STEPS[0].route) ? undefined : findMenuButton();
    let wait: ReturnType<typeof setTimeout> | undefined;

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
      // The first card has nowhere to go back.
      popover.previousButton.hidden = index === 0;
    };

    // The phone sidebar is a modal sheet that closes on any press outside
    // it; the card and the dimmed backdrop must not count as outside.
    const keepSidebarOpen = (popover: PopoverDOM) => {
      popover.wrapper.setAttribute("data-keep-sidebar-open", "");
      document
        .querySelector(".driver-overlay")
        ?.setAttribute("data-keep-sidebar-open", "");
    };

    const unmountArt = () => {
      const root = art;
      art = undefined;
      // Unmounting a root while React renders warns; defer it.
      queueMicrotask(() => root?.unmount());
    };

    const teardown = () => {
      clearTimeout(wait);
      menu?.removeEventListener("click", onMenuOpen);
      tour?.destroy();
      unmountArt();
    };

    // driver.js only reports a destroy it started itself, so the tour tells
    // the moment it closes and then tears the overlay down.
    const close = (finished: boolean) => {
      if (closed) return;
      closed = true;
      teardown();
      previousFocus?.focus?.();
      onClose();
      toast.info(t(finished ? "guide.tour.finished" : "guide.tour.skipped"));
    };

    const start = (config: Config) => {
      tour = driver({
        popoverClass: "ecbot-tour",
        animate: !window.matchMedia?.("(prefers-reduced-motion: reduce)")
          .matches,
        overlayColor: "var(--bg-overlay)",
        overlayOpacity: 1,
        stagePadding: 4,
        stageRadius: 8,
        popoverOffset: 12,
        smoothScroll: true,
        overlayClickBehavior: () => {},
        nextBtnText: t("guide.tour.next"),
        prevBtnText: t("actions.back"),
        doneBtnText: t("guide.tour.done"),
        // driver.js places the card before React draws the scene into it,
        // so place it again once the step settles and the card has its size.
        onHighlighted: () => tour?.refresh(),
        onDoneClick: () => close(true),
        // The X and Escape both land here; Done has its own hook above.
        onDestroyStarted: () => close(false),
        ...config,
      });
      tour.drive();
    };

    const startSteps = (inMenu: boolean) =>
      start({
        showProgress: true,
        showButtons: ["next", "previous", "close"],
        // A tap on a link inside the phone sheet would close it mid-tour.
        disableActiveInteraction: inMenu,
        steps: TOUR_STEPS.map((step) => ({
          element: findLink(step.route),
          popover: {
            title: t(`guide.features.${step.feature}.title`),
            description: t(`guide.features.${step.feature}.body`),
            side: "right",
            align: "center",
          },
        })),
        onPopoverRender: (popover, { state }) => {
          // The X is the only way out.
          popover.closeButton.setAttribute("aria-label", t("guide.tour.skip"));
          renderArt(popover, state.activeIndex ?? 0);
          if (inMenu) keepSidebarOpen(popover);
        },
      });

    // Once the menu opens, wait for its links to slide in, then tour them.
    function onMenuOpen() {
      menu?.removeEventListener("click", onMenuOpen);
      tour?.destroy();
      const startedAt = Date.now();
      const poll = () => {
        if (closed) return;
        if (findLink(TOUR_STEPS[0].route)) return startSteps(true);
        if (Date.now() - startedAt > MENU_WAIT_MS) return close(false);
        wait = setTimeout(poll, MENU_POLL_MS);
      };
      poll();
    }

    if (menu) {
      menu.addEventListener("click", onMenuOpen);
      start({
        showButtons: ["close"],
        steps: [
          {
            element: menu,
            popover: {
              title: t("guide.tour.openMenu.title"),
              description: t("guide.tour.openMenu.body"),
              side: "bottom",
              align: "start",
            },
          },
        ],
        onPopoverRender: (popover) =>
          popover.closeButton.setAttribute("aria-label", t("guide.tour.skip")),
      });
    } else {
      startSteps(false);
    }

    return () => {
      if (closed) return;
      closed = true;
      teardown();
    };
  }, [onClose, t]);

  return null;
};

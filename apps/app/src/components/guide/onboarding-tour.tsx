import { Button, IconButton, Text, clx, toast } from "@medusajs/ui";
import { XMark } from "@medusajs/icons";
import { motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FC,
} from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { TOUR_STEPS } from "./constants";
import { FeatureArt } from "./feature-art";

const CARD_WIDTH = 300;
const GAP = 16;
const RING = 4;
const CARD_HEIGHT = 300;
const ARROW_FROM_TOP = 150;
const ARROW_SIZE = 12;

interface OnboardingTourProps {
  onClose: () => void;
}

// The sidebar link of a step's page, when the sidebar is on screen.
const findTarget = (route: string) => {
  const link = document.querySelector<HTMLElement>(
    `aside a[href$="/${route}"]`,
  );
  const rect = link?.getBoundingClientRect();
  return rect && rect.width > 0 ? rect : null;
};

/**
 * Three cards after the first agent goes live, each pointing at the sidebar
 * link of a page the owner needs next. On a phone, where the sidebar is
 * folded away, the cards sit in the middle of the screen.
 */
export const OnboardingTour: FC<OnboardingTourProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<DOMRect | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = TOUR_STEPS[index];
  const Icon = step.icon;
  const last = index === TOUR_STEPS.length - 1;

  useLayoutEffect(() => {
    const measure = () => setTarget(findTarget(step.route));
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [step.route]);

  useEffect(() => nextRef.current?.focus(), [index]);

  const finish = useCallback(
    (skipped: boolean) => {
      onClose();
      toast.info(t(skipped ? "guide.tour.skipped" : "guide.tour.finished"));
    },
    [onClose, t],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  // A coach mark, not a modal: the highlighted link stays clickable. Focus
  // goes back where it was when the tour closes.
  const [previous] = useState(
    () => document.activeElement as HTMLElement | null,
  );
  useEffect(() => () => previous?.focus?.(), [previous]);

  const hole = target && {
    x: target.left - RING,
    y: target.top - RING,
    w: target.width + RING * 2,
    h: target.height + RING * 2,
  };
  // The arrow points at the link from the text, below the art.
  const targetMiddle = target ? target.top + target.height / 2 : 0;
  const cardTop = Math.max(
    GAP,
    Math.min(
      targetMiddle - ARROW_FROM_TOP,
      window.innerHeight - CARD_HEIGHT - GAP,
    ),
  );
  const arrowTop = Math.max(
    ARROW_SIZE,
    Math.min(targetMiddle - cardTop, CARD_HEIGHT - ARROW_SIZE * 2),
  );

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        aria-hidden
        className="bg-ui-bg-overlay absolute inset-0 transition-[clip-path] duration-200 ease-out"
        style={
          hole
            ? {
                clipPath: `path(evenodd, 'M0 0H${window.innerWidth}V${window.innerHeight}H0Z M${hole.x} ${hole.y}h${hole.w}v${hole.h}h-${hole.w}Z')`,
              }
            : undefined
        }
      />
      {hole && (
        <div
          aria-hidden
          className="shadow-borders-interactive-with-focus pointer-events-none absolute rounded-lg transition-all duration-200 ease-out"
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }}
        />
      )}
      <motion.div
        key={index}
        role="dialog"
        aria-labelledby="onboarding-tour-title"
        initial={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.3, bounce: 0 }}
        className={clx(
          "shadow-elevation-flyout absolute rounded-xl",
          !target && "inset-x-4 top-1/2 mx-auto max-w-[300px] -translate-y-1/2",
        )}
        style={
          target
            ? { left: target.right + GAP, top: cardTop, width: CARD_WIDTH }
            : undefined
        }
      >
        {target && (
          <span
            aria-hidden
            className="bg-ui-bg-base absolute -left-1.5 size-3 rotate-45 rounded-[2px]"
            style={{ top: arrowTop - ARROW_SIZE / 2 }}
          />
        )}
        <div className="bg-ui-bg-base relative overflow-hidden rounded-xl">
          <div className="relative">
            <FeatureArt
              feature={step.feature}
              icon={<Icon />}
              className="max-w-none rounded-none"
            />
            <IconButton
              size="small"
              variant="transparent"
              className="bg-ui-bg-base/90 absolute top-2 right-2 rounded-full"
              aria-label={t("guide.tour.skip")}
              onClick={() => finish(true)}
            >
              <XMark />
            </IconButton>
          </div>
          <div className="flex flex-col gap-y-1 px-4 pt-3 pb-4">
            <Text
              id="onboarding-tour-title"
              size="base"
              weight="plus"
              leading="compact"
            >
              {t(`guide.features.${step.feature}.title`)}
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              {t(`guide.features.${step.feature}.body`)}
            </Text>
            <div className="mt-3 flex items-center gap-x-2">
              <div
                className="flex flex-1 items-center gap-x-1.5"
                aria-label={t("guide.tour.progress", {
                  current: index + 1,
                  total: TOUR_STEPS.length,
                })}
                role="img"
              >
                {TOUR_STEPS.map((tourStep, i) => (
                  <span
                    key={tourStep.feature}
                    className={
                      i === index
                        ? "bg-ui-fg-interactive h-1.5 w-4 rounded-full"
                        : "bg-ui-border-strong size-1.5 rounded-full"
                    }
                  />
                ))}
              </div>
              {index > 0 && (
                <Button
                  size="small"
                  variant="transparent"
                  onClick={() => setIndex(index - 1)}
                >
                  {t("actions.back")}
                </Button>
              )}
              <Button
                ref={nextRef}
                size="small"
                onClick={() => (last ? finish(false) : setIndex(index + 1))}
              >
                {t(last ? "guide.tour.done" : "guide.tour.next")}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

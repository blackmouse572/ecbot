import { CheckCircleSolid } from "@medusajs/icons";
import { Button, Text } from "@medusajs/ui";
import { motion, useReducedMotion } from "motion/react";
import { Dialog } from "radix-ui";
import { useRef, type FC } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { ROUTES } from "@/routes/constants";
import { CELEBRATION_BACKGROUND } from "./constants";

interface FirstConversationCelebrationProps {
  onClose: () => void;
}

/** Shown once, when the first customer conversation reaches the workspace:
 * the moment the agent starts working for the shop. */
export const FirstConversationCelebration: FC<
  FirstConversationCelebrationProps
> = ({ onClose }) => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const reduceMotion = useReducedMotion();
  const openRef = useRef<HTMLAnchorElement>(null);

  return (
    <Dialog.Root defaultOpen onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-ui-bg-overlay fixed inset-0 z-50" />
        <Dialog.Content
          aria-describedby="first-conversation-body"
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            openRef.current?.focus();
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 outline-none"
        >
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            className="bg-ui-bg-base shadow-elevation-modal w-full max-w-[340px] overflow-hidden rounded-2xl text-center"
          >
            <div aria-hidden className="relative h-28">
              <img
                src={CELEBRATION_BACKGROUND}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
              <span className="bg-ui-bg-base text-ui-fg-interactive shadow-elevation-card-rest absolute top-1/2 left-1/2 flex size-14 -translate-1/2 items-center justify-center rounded-full [&_svg]:size-7">
                <CheckCircleSolid />
              </span>
            </div>
            <div className="flex flex-col items-center gap-y-1 px-5 pt-4 pb-5">
              <Dialog.Title asChild>
                <Text size="base" weight="plus" leading="compact">
                  {t("guide.firstConversation.title")}
                </Text>
              </Dialog.Title>
              <Text
                id="first-conversation-body"
                size="small"
                className="text-ui-fg-subtle"
              >
                {t("guide.firstConversation.body")}
              </Text>
              <div className="mt-4 flex w-full flex-col gap-y-2">
                <Button asChild className="w-full" onClick={onClose}>
                  <Link
                    ref={openRef}
                    to={`/${workspaceSlug}/${ROUTES.Conversations}`}
                  >
                    {t("guide.firstConversation.open")}
                  </Link>
                </Button>
                <Dialog.Close asChild>
                  <Button variant="transparent" className="w-full">
                    {t("guide.firstConversation.later")}
                  </Button>
                </Dialog.Close>
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

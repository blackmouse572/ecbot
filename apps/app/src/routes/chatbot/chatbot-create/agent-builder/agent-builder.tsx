import { RouteFocusModal, useRouteModal } from "@/components/modals";
import { useChatbot } from "@/hooks/api";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SidebarRight, XMark } from "@medusajs/icons";
import { Button, IconButton, Text, clx } from "@medusajs/ui";
import { SidebarProvider, useSidebar } from "@repo/ui/layout";
import { useEffect, useRef, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { agentDisplayName } from "./agent-display-name";
import { BuilderThread } from "./components/builder-thread";
import { TestPanel } from "./components/test-panel";
import { useAgentBuilder, type AgentBuilderController } from "./use-agent-builder";

// Matches Tailwind's `md:` breakpoint, which decides whether the test panel
// renders as a grid column (desktop) or a full-screen sheet (mobile).
const DESKTOP_QUERY = "(min-width: 768px)";

export function AgentBuilder() {
  const [params] = useSearchParams();
  const hydrateId = params.get("chatbotId") ?? "";
  const { chatbot } = useChatbot(hydrateId, { enabled: !!hydrateId });
  const builder = useAgentBuilder({ hydrateFrom: hydrateId ? chatbot : undefined });

  return (
    // A SidebarProvider scoped to the builder for the test panel's
    // open/closed state. It only shadows the sidebar context for the
    // descendants below (header toggle, panel, mobile sheet); it never
    // reaches the app's nav sidebar, which keeps its own outer
    // SidebarProvider from `ProtectedRoute`.
    <SidebarProvider defaultDesktopOpen={false}>
      <AgentBuilderPanels builder={builder} />
    </SidebarProvider>
  );
}

function AgentBuilderPanels({ builder }: { builder: AgentBuilderController }) {
  const { t } = useTranslation();
  const { desktop, mobile, toggle } = useSidebar();
  const isDesktopViewport = useMediaQuery(DESKTOP_QUERY);
  const { setCloseOnEscape } = useRouteModal();
  const panelOpen = isDesktopViewport ? desktop : mobile;
  const sheetOpen = !isDesktopViewport && mobile;
  const sheetCloseRef = useRef<HTMLButtonElement>(null);

  // The mobile sheet is modal: focus moves in on open and returns to the
  // opener on close, and Escape closes the sheet, not the route modal.
  useEffect(() => {
    if (!sheetOpen) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheetCloseRef.current?.focus();
    setCloseOnEscape(false);
    return () => {
      setCloseOnEscape(true);
      opener?.focus();
    };
  }, [sheetOpen, setCloseOnEscape]);

  // Opens the test panel once, automatically, the first time this session's
  // draft chatbot is created (chatbotId goes null -> id). Never re-opens
  // after the user closes it.
  const prevChatbotId = useRef(builder.state.chatbotId);
  const autoOpened = useRef(false);
  useEffect(() => {
    const prev = prevChatbotId.current;
    const curr = builder.state.chatbotId;
    prevChatbotId.current = curr;
    if (autoOpened.current || prev !== null || !curr) return;
    autoOpened.current = true;
    if (!desktop) toggle("desktop");
  }, [builder.state.chatbotId, desktop, toggle]);

  // Computed once here and passed down, so the header button, the floating
  // button and TestPanel's tab/heading never duplicate the name fallback.
  const displayName = agentDisplayName(builder.state.profile, t);
  const tryAgentLabel = t("agentBuilder.ui.tryAgent", { name: displayName });
  // Batch 3: unlocks once the draft exists (chatbotId set), not merely once
  // it's ready to be created.
  const chatbotId = builder.state.chatbotId;
  const unlocked = !!chatbotId;

  return (
    <>
      <RouteFocusModal.Header>
        <div className="flex w-full items-center justify-between gap-2">
          <Text size="small" className="text-ui-fg-subtle">{t("agentBuilder.ui.title")}</Text>
          {unlocked && (
            <Button
              variant="transparent"
              size="small"
              className="max-w-[240px]"
              title={tryAgentLabel}
              aria-expanded={panelOpen}
              onClick={() => toggle(isDesktopViewport ? "desktop" : "mobile")}
            >
              <SidebarRight className="size-4 shrink-0" />
              <span className="truncate">{tryAgentLabel}</span>
            </Button>
          )}
        </div>
      </RouteFocusModal.Header>
      <RouteFocusModal.Body
        className={clx(
          "grid grid-cols-1 overflow-hidden",
          "md:grid-cols-[minmax(0,1fr)_var(--panel-w)] md:transition-[grid-template-columns] md:duration-300 md:ease-drawer",
          "motion-reduce:md:transition-none",
        )}
        style={{ "--panel-w": desktop ? "420px" : "0px" } as CSSProperties}
      >
        <div className="min-h-0 overflow-hidden">
          <BuilderThread {...builder} />
        </div>

        {chatbotId && (
          // Batch 3: a single persistent panel element whose classes switch
          // between the desktop column and the mobile sheet, instead of two
          // mutually exclusive branches. Crossing the md breakpoint no
          // longer unmounts (and reconnects) TestPanel/AIChatCard.
          <aside
            className={clx(
              "overflow-hidden bg-ui-bg-subtle",
              // Mobile: full-screen sheet, transform-driven.
              "fixed inset-0 z-40 flex flex-col transition-transform duration-300 ease-drawer",
              "motion-reduce:translate-y-0 motion-reduce:transition-opacity motion-reduce:duration-200 motion-reduce:ease-out",
              mobile ? "translate-y-0 motion-reduce:opacity-100" : "translate-y-full motion-reduce:opacity-0",
              // Desktop: static grid column, width driven by the parent's
              // --panel-w, no transform/transition of its own.
              // The reduced-motion opacity crossfade is mobile-only.
              "md:static md:inset-auto md:z-auto md:flex md:translate-y-0 md:border-l md:border-ui-border-base md:transition-none md:motion-reduce:opacity-100",
            )}
            inert={!panelOpen || undefined}
            aria-hidden={!panelOpen || undefined}
            role={sheetOpen ? "dialog" : undefined}
            aria-modal={sheetOpen || undefined}
            aria-label={sheetOpen ? tryAgentLabel : undefined}
            onKeyDown={(e) => {
              if (!sheetOpen || e.key !== "Escape") return;
              e.stopPropagation();
              toggle("mobile");
            }}
          >
            <div className="flex justify-end p-4 pb-0 md:hidden">
              <IconButton ref={sheetCloseRef} variant="transparent" onClick={() => toggle("mobile")}>
                <XMark />
                <span className="sr-only">{t("actions.close")}</span>
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden p-4 md:w-[420px]">
              <TestPanel
                chatbotId={chatbotId}
                profile={builder.state.profile}
                extraInstructions={builder.extraInstructions}
                agentDisplayName={displayName}
              />
            </div>
          </aside>
        )}

        {unlocked && !isDesktopViewport && (
          <Button
            className="fixed bottom-4 right-4 z-30 max-w-[70vw]"
            title={tryAgentLabel}
            aria-expanded={mobile}
            onClick={() => {
              if (!mobile) toggle("mobile");
            }}
          >
            <span className="truncate">{tryAgentLabel}</span>
          </Button>
        )}
      </RouteFocusModal.Body>
    </>
  );
}

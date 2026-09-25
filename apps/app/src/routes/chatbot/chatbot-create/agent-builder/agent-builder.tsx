import { RouteFocusModal } from "@/components/modals";
import { useChatbot } from "@/hooks/api";
import { useMediaQuery } from "@/hooks/use-media-query";
import { SidebarRight, XMark } from "@medusajs/icons";
import { Button, IconButton, Text, clx } from "@medusajs/ui";
import { SidebarProvider, useSidebar } from "@repo/ui/layout";
import { useEffect, useRef, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { isDraftReady } from "./builder-state";
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

  const panel = <TestPanel chatbotId={builder.state.chatbotId} profile={builder.state.profile} extraInstructions={builder.extraInstructions} />;
  // Wireframe delta section 4: before the business type is answered
  // (step 2), neither the panel nor the header button is shown.
  const unlocked = isDraftReady(builder.state);

  return (
    <>
      <RouteFocusModal.Header>
        <div className="flex w-full items-center justify-between gap-2">
          <Text size="small" className="text-ui-fg-subtle">{t("agentBuilder.ui.title")}</Text>
          {unlocked && (
            <Button variant="transparent" size="small" onClick={() => toggle(isDesktopViewport ? "desktop" : "mobile")}>
              <SidebarRight className="size-4" />
              {t("agentBuilder.ui.tryAgent")}
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

        {unlocked && isDesktopViewport && (
          <div
            className="overflow-hidden border-l border-ui-border-base bg-ui-bg-subtle"
            inert={!desktop || undefined}
            aria-hidden={!desktop || undefined}
          >
            <div className="h-full w-[420px] overflow-hidden p-4">{panel}</div>
          </div>
        )}
        {unlocked && !isDesktopViewport && (
          <aside
            className={clx(
              "fixed inset-0 z-40 flex flex-col overflow-hidden bg-ui-bg-subtle p-4",
              "transition-transform duration-300 ease-drawer",
              "motion-reduce:translate-y-0 motion-reduce:transition-opacity motion-reduce:duration-200 motion-reduce:ease-out",
              mobile ? "translate-y-0 motion-reduce:opacity-100" : "translate-y-full motion-reduce:opacity-0",
            )}
            inert={!mobile || undefined}
            aria-hidden={!mobile || undefined}
          >
            <div className="flex justify-end">
              <IconButton variant="transparent" onClick={() => toggle("mobile")}>
                <XMark />
                <span className="sr-only">{t("actions.close")}</span>
              </IconButton>
            </div>
            {panel}
          </aside>
        )}

        {unlocked && !isDesktopViewport && (
          <Button
            className="fixed bottom-4 right-4 z-30"
            onClick={() => {
              if (!mobile) toggle("mobile");
            }}
          >
            {t("agentBuilder.ui.tryAgent")}
          </Button>
        )}
      </RouteFocusModal.Body>
    </>
  );
}

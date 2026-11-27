import { Suspense, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Outlet, useParams } from "react-router-dom";
import { useElementWidth } from "@/hooks/use-element-width";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ConversationList } from "../conversation-list/conversation-list";
import { SMALL_SCREEN_QUERY } from "../constants";
import { ConversationDetailSkeleton } from "../conversation-detail/conversation-detail-skeleton";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components";
import { LIST_DEFAULT_SIZE, LIST_MAX_SIZE, listMinSize } from "./list-min-size";

export function ConversationsShell() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isSmallScreen = useMediaQuery(SMALL_SCREEN_QUERY);
  const containerRef = useRef<HTMLDivElement>(null);
  const minSize = listMinSize(useElementWidth(containerRef));

  const thread = (
    <main className="flex h-full flex-col overflow-hidden">
      <Suspense fallback={<ConversationDetailSkeleton />}>
        <Outlet />
      </Suspense>
    </main>
  );

  const list = (
    <aside className="bg-ui-bg-subtle border-ui-border-base flex h-full flex-col border-r">
      <ConversationList />
    </aside>
  );

  return (
    <>
      <Helmet>
        <title>{t("conversations.title")} - Ecbot</title>
      </Helmet>
      <div
        ref={containerRef}
        data-full-bleed
        className="h-[calc(100dvh-57px)] w-full overflow-hidden"
      >
        {isSmallScreen ? (
          // Small screens stack like a mobile app: the list, or the open thread.
          id ? (
            thread
          ) : (
            list
          )
        ) : (
          <ResizablePanelGroup
            direction="horizontal"
            autoSaveId="conversations:shell"
            // The handle is z-indexed; isolate it so drawers and their scrim cover it.
            className="isolate"
          >
            <ResizablePanel
              id="conversation-list"
              order={1}
              defaultSize={Math.max(LIST_DEFAULT_SIZE, minSize)}
              minSize={minSize}
              maxSize={LIST_MAX_SIZE}
            >
              {list}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel id="conversation-main" order={2} defaultSize={76}>
              {thread}
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>
    </>
  );
}

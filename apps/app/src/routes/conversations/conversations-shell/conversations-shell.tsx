import { Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Outlet, useParams } from "react-router-dom";
import { useMediaQuery } from "@/hooks/use-media-query";
import { ConversationList } from "../conversation-list/conversation-list";
import { SMALL_SCREEN_QUERY } from "../constants";
import { LogoBoxSpinner } from "@repo/ui/common-components";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components";

export function ConversationsShell() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const isSmallScreen = useMediaQuery(SMALL_SCREEN_QUERY);

  const thread = (
    <main className="flex h-full flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <LogoBoxSpinner />
          </div>
        }
      >
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
      <div className="h-[calc(100dvh-57px)] w-full overflow-hidden">
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
          >
            <ResizablePanel
              id="conversation-list"
              order={1}
              defaultSize={24}
              minSize={16}
              maxSize={40}
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

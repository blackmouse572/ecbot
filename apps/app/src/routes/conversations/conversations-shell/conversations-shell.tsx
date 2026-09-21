import { Suspense } from "react";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";
import { ConversationList } from "../conversation-list/conversation-list";
import { LogoBoxSpinner } from "@repo/ui/common-components";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@repo/ui/components";

export function ConversationsShell() {
  const { t } = useTranslation();

  return (
    <>
      <Helmet>
        <title>{t("conversations.title")} - Ecbot</title>
      </Helmet>
      <div className="h-[calc(100vh-57px)] w-full overflow-hidden">
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
            <aside className="bg-ui-bg-subtle border-ui-border-base flex h-full flex-col border-r">
              <ConversationList />
            </aside>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel id="conversation-main" order={2} defaultSize={76}>
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
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
}

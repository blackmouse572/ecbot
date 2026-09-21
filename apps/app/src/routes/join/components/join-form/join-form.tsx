import { RouteFocusModal } from "@/components/modals";
import { useJoinWorkspace } from "@/hooks/api";
import { OnboardSuccessTab } from "@/routes/onboard/onboard-join/components/onboard-join-form/onboard-success-tab";
import { ProgressTabs, type ProgressStatus } from "@medusajs/ui";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useSearchParams } from "react-router-dom";
import { JoinTab } from "./join-tab";

const TAB = {
  JOIN: "JOIN",
  SUCCESS: "SUCCESS",
};
type TabState = Record<(typeof TAB)[keyof typeof TAB], ProgressStatus>;
const initialTabState: TabState = {
  [TAB.JOIN]: "in-progress",
  [TAB.SUCCESS]: "not-started",
};

export const JoinForm = () => {
  const { t } = useTranslation();

  const [tab, setTab] = useState<keyof typeof TAB>("JOIN");
  const [tabState, setTabState] = useState<TabState>(initialTabState);
  const { mutateAsync: joinWorkspace, isPending } = useJoinWorkspace();
  const [search] = useSearchParams();
  const token = search.get("tokens");

  const tabOrder = useMemo(() => {
    return Object.values(TAB);
  }, []);

  const handleSubmit = async () => {
    if (!token) return;
    await joinWorkspace(token);
    setTabState((prev) => ({
      ...prev,
      [TAB.JOIN]: "completed",
      [TAB.SUCCESS]: "in-progress",
    }));
    setTab("SUCCESS");
  };

  const handleChangeTab = (tab: keyof typeof TAB) => {
    return;
    setTab(tab);
  };

  if (!token) return <Navigate to="/" replace />;

  return (
    <ProgressTabs
      value={tab}
      onValueChange={(tab) => handleChangeTab(tab as keyof typeof TAB)}
      className="flex h-full flex-col overflow-hidden"
    >
      <RouteFocusModal.Header>
        <div className="flex w-full items-center justify-between gap-x-4">
          <div className="-my-2 w-full max-w-[600px] border-l">
            <ProgressTabs.List className="">
              <ProgressTabs.Trigger
                status={tabState[TAB.JOIN]}
                value={TAB.JOIN}
              >
                {t("onboard.join.tabs.join")}
              </ProgressTabs.Trigger>
              <ProgressTabs.Trigger
                status={tabState[TAB.SUCCESS]}
                value={TAB.SUCCESS}
              >
                {t("onboard.join.tabs.success")}
              </ProgressTabs.Trigger>
            </ProgressTabs.List>
          </div>
        </div>
      </RouteFocusModal.Header>
      <RouteFocusModal.Body className="size-full overflow-hidden">
        <ProgressTabs.Content
          className="size-full overflow-y-auto"
          value={TAB.JOIN}
        >
          <JoinTab
            onJoinSuccess={() => {
              setTab("SUCCESS");
              setTabState((prev) => ({
                ...prev,
                [TAB.JOIN]: "completed",
                [TAB.SUCCESS]: "completed",
              }));
            }}
          />
        </ProgressTabs.Content>
        <ProgressTabs.Content
          className="size-full overflow-y-auto"
          value={TAB.SUCCESS}
        >
          <OnboardSuccessTab />
        </ProgressTabs.Content>
      </RouteFocusModal.Body>
      <RouteFocusModal.Footer>{/*  */}</RouteFocusModal.Footer>
    </ProgressTabs>
  );
};

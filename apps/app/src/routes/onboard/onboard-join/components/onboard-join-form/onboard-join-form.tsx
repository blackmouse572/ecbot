import { RouteFocusModal } from "@/components/modals";
import { KeyboundForm } from "@/components/utils/keybound-form";
import {
  useGetWorkspaceByInvitationCodeMutation,
  useJoinWorkspaceWithInvitationCode,
} from "@/hooks/api";
import { partialFormValidation } from "@/libs/validations";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, ProgressTabs, type ProgressStatus } from "@medusajs/ui";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import z from "zod/v4";
import { OnboardConfirmTab } from "./onboard-confirm-tab";
import { OnboardJoinTab } from "./onboard-join-tab";
import { OnboardSuccessTab } from "./onboard-success-tab";

const TAB = {
  JOIN: "JOIN",
  CONFIRM: "CONFIRM",
  SUCCESS: "SUCCESS",
};
type TabState = Record<(typeof TAB)[keyof typeof TAB], ProgressStatus>;
const initialTabState: TabState = {
  [TAB.JOIN]: "in-progress",
  [TAB.CONFIRM]: "not-started",
  [TAB.SUCCESS]: "not-started",
};

const onboardJoinSchema = z.object({
  invitationCode: z.string().min(6).max(6),
});
const onboardJoinFields = Object.keys(onboardJoinSchema.shape);

export const OnboardJoinForm = () => {
  const { t } = useTranslation();
  const form = useForm<z.infer<typeof onboardJoinSchema>>({
    resolver: zodResolver(onboardJoinSchema),
    defaultValues: {
      invitationCode: "",
    },
  });

  const [tab, setTab] = useState<keyof typeof TAB>("JOIN");
  const [tabState, setTabState] = useState<TabState>(initialTabState);
  const {
    mutateAsync: getWorkspace,
    isPending,
    workspace,
  } = useGetWorkspaceByInvitationCodeMutation();
  const joinWorkspace = useJoinWorkspaceWithInvitationCode();

  const tabOrder = useMemo(() => {
    return Object.values(TAB);
  }, []);

  const handleSubmit = async (
    newTab: keyof typeof TAB,
    data: z.infer<typeof onboardJoinSchema>,
  ) => {
    const isValid = partialFormValidation<z.infer<typeof onboardJoinSchema>>(
      form,
      onboardJoinFields,
      onboardJoinSchema,
    );

    if (isValid) {
      const { hasWorkspace, message, statusCode } = await getWorkspace(
        data.invitationCode,
      )
        .then((res) => ({
          hasWorkspace: !!res,
          statusCode: res?.statusCode,
          message: res?.message,
        }))
        .catch((e) => {
          return {
            hasWorkspace: false,
            message: e.response?.data.message || e.message,
            statusCode: e.response?.data.statusCode || e.statusCode,
          };
        });

      if (!hasWorkspace) {
        form.setError("invitationCode", {
          type: "manual",
          message: t(`errors:${statusCode}`, {
            defaultValue: message,
          }),
        });
        return;
      }

      setTab(newTab);
      setTabState((prev) => ({
        ...prev,
        [tab]: "completed",
        [newTab]: "in-progress",
      }));
    }
    return;
  };

  const handleJoinWorkspace = async (nextTab: keyof typeof TAB) => {
    if (!workspace) {
      return;
    }

    const { message, statusCode, success } = await joinWorkspace
      .mutateAsync(workspace.invitationCode || "")
      .then((res) => ({
        success: true,
        statusCode: 200,
        message: "",
      }))
      .catch((e) => ({
        success: false,
        statusCode: e.response?.data.statusCode || e.statusCode,
        message: e.response?.data.message || e.message,
      }));
    if (!success) {
      form.setError("root", {
        type: "manual",
        message: t(`errors:${statusCode}`, {
          defaultValue: message,
        }),
      });
      return;
    }
    setTabState((prev) => ({
      ...prev,
      [tab]: "completed",
      [nextTab]: "in-progress",
    }));
    setTab(nextTab);
  };

  const handleNextTab = async () => {
    if (tab === TAB.JOIN) {
      await handleSubmit(TAB.CONFIRM as keyof typeof TAB, form.getValues());
      return;
    }
    if (tab === TAB.CONFIRM) {
      await handleJoinWorkspace(TAB.SUCCESS as keyof typeof TAB);
      return;
    }
    const nextTabIndex = tabOrder.indexOf(tab) + 1;
    if (nextTabIndex < tabOrder.length) {
      const nextTab = tabOrder[nextTabIndex] as keyof typeof TAB;
      setTab(nextTab);
      setTabState((prev) => ({
        ...prev,
        [tab]: "completed",
        [nextTab]: "in-progress",
      }));
    }
  };

  const handleReset = () => {
    form.reset();
    setTab(TAB.JOIN as keyof typeof TAB);
    setTabState(initialTabState);
  };

  return (
    <RouteFocusModal.Form form={form}>
      <ProgressTabs
        value={tab}
        className="flex h-full flex-col overflow-hidden"
      >
        <KeyboundForm className="flex-1 flex flex-col">
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
                    status={tabState[TAB.CONFIRM]}
                    value={TAB.CONFIRM}
                  >
                    {t("onboard.join.tabs.confirm")}
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
              <OnboardJoinTab />
            </ProgressTabs.Content>
            <ProgressTabs.Content
              className="size-full overflow-y-auto"
              value={TAB.CONFIRM}
            >
              {workspace && <OnboardConfirmTab data={workspace} />}
            </ProgressTabs.Content>
            <ProgressTabs.Content
              className="size-full overflow-y-auto"
              value={TAB.SUCCESS}
            >
              {workspace && <OnboardSuccessTab data={workspace} joined />}
            </ProgressTabs.Content>
          </RouteFocusModal.Body>
          <RouteFocusModal.Footer>
            <PrimaryButton
              tab={tab}
              next={handleNextTab}
              reset={handleReset}
              isLoading={isPending || joinWorkspace.isPending}
            />
          </RouteFocusModal.Footer>
        </KeyboundForm>
      </ProgressTabs>
    </RouteFocusModal.Form>
  );
};

type PrimaryButtonProps = {
  tab: keyof typeof TAB;
  next: () => void | Promise<void>;
  reset: () => void;
  isLoading?: boolean;
};
const PrimaryButton = ({ tab, next, reset, isLoading }: PrimaryButtonProps) => {
  const { t } = useTranslation();
  if (tab === TAB.SUCCESS) {
    return null;
  }
  if (tab === TAB.JOIN) {
    return (
      <Button
        type="button"
        onClick={next}
        disabled={isLoading}
        isLoading={isLoading}
      >
        {t("actions.continued")}
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        type="button"
        variant="transparent"
        disabled={isLoading}
        isLoading={isLoading}
        onClick={() => reset()}
      >
        {t("actions.tryAgain")}
      </Button>
      <Button
        type="button"
        disabled={isLoading}
        isLoading={isLoading}
        onClick={next}
      >
        {t("actions.continued")}
      </Button>
    </div>
  );
};

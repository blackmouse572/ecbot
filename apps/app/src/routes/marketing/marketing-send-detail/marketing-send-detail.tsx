import {
  useMarketingSend,
  useUpdateMarketingSend,
} from "@/hooks/api/marketing-sends";
import { useDate } from "@/hooks/use-date";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { readApiError } from "@/libs/api-error";
import {
  Button,
  Container,
  Heading,
  StatusBadge,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { TwoColumnPageSkeleton } from "@repo/ui/common-components";
import { TwoColumnPage } from "@repo/ui/layout";
import {
  IconPencil,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { StageTag } from "../components/stage-tag";
import { MARKETING_SEND_STATUS_COLOR, TODO_STAGE } from "../constants";
import { sendStatus } from "../utils";
import { SendChannelsSection } from "./components/send-channels-section";
import { SendMessageSection } from "./components/send-message-section";
import { SendNotSentSection } from "./components/send-not-sent-section";
import { SendRepliesSection } from "./components/send-replies-section";
import { SendStats } from "./components/send-stats";

/** One send: how customers answered, by channel, and who it missed. */
export const MarketingSendDetail = () => {
  const { t } = useTranslation();
  const prompt = usePrompt();
  const { getFullDate } = useDate();
  const { workspaceSlug } = useWorkspaceParams();
  const { sendId = "" } = useParams<{ sendId: string }>();

  const { send, isLoading, isError, error } = useMarketingSend(
    workspaceSlug,
    sendId,
  );
  const update = useUpdateMarketingSend(workspaceSlug, sendId);

  if (isError) {
    throw error;
  }

  if (isLoading || !send) {
    return <TwoColumnPageSkeleton mainSections={2} sidebarSections={2} />;
  }

  const status = sendStatus(send);
  // A ONCE send that has gone out has nothing left to change.
  const editable = send.mode === "AUTO" || send.stats.queued > 0;

  const toggle = async () => {
    if (send.active) {
      const confirmed = await prompt({
        title: t("marketing.sends.turnOff.title", { name: send.name }),
        description: t("marketing.sends.turnOff.description"),
        confirmText: t("marketing.sends.turnOff.action"),
        cancelText: t("actions.cancel"),
      });
      if (!confirmed) return;
    }

    try {
      await update.mutateAsync({ active: !send.active });
      toast.success(
        t(
          send.active
            ? "marketing.sends.turnOff.done"
            : "marketing.sends.turnOn.done",
        ),
      );
    } catch (e) {
      toast.error(readApiError(e).message ?? t("marketing.sends.error"));
    }
  };

  return (
    <div className="flex w-full flex-col gap-y-3">
      <Container className="flex flex-wrap items-start justify-between gap-3 px-6 py-4">
        <div className="flex min-w-0 flex-col gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <Heading level="h1" className="min-w-0 break-words">
              {send.name}
            </Heading>
            <StatusBadge
              color={MARKETING_SEND_STATUS_COLOR[status]}
              className="whitespace-nowrap"
            >
              {t(`marketing.sends.status.${status}`)}
            </StatusBadge>
            {send.preset && <StageTag stage={TODO_STAGE[send.preset]} />}
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {t(`marketing.sends.summary.${status}`, {
              date: getFullDate(new Date(send.createdAt)),
            })}
          </Text>
        </div>
        <div className="flex items-center gap-x-2">
          {editable && (
            <Button size="small" variant="secondary" asChild>
              <Link to="edit">
                <IconPencil size={15} stroke={1.5} />
                {t("marketing.sends.edit.action")}
              </Link>
            </Button>
          )}
          {send.mode === "AUTO" && (
            <Button
              size="small"
              variant="secondary"
              onClick={toggle}
              isLoading={update.isPending}
            >
              {send.active ? (
                <IconPlayerPause size={15} stroke={1.5} />
              ) : (
                <IconPlayerPlay size={15} stroke={1.5} />
              )}
              {t(
                send.active
                  ? "marketing.sends.turnOff.action"
                  : "marketing.sends.turnOn.action",
              )}
            </Button>
          )}
        </div>
      </Container>

      <SendStats send={send} />

      <TwoColumnPage hasOutlet>
        <TwoColumnPage.Main>
          <SendRepliesSection key={send.id} sendId={send.id} />
          <SendChannelsSection send={send} />
        </TwoColumnPage.Main>
        <TwoColumnPage.Sidebar>
          <SendMessageSection send={send} />
          <SendNotSentSection send={send} />
        </TwoColumnPage.Sidebar>
      </TwoColumnPage>
    </div>
  );
};

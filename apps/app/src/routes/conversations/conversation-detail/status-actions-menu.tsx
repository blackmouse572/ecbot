import {
  ArrowUpRightOnBox,
  ArrowUturnLeft,
  CheckCircleSolid,
  EllipsisHorizontal,
} from "@medusajs/icons";
import {
  DropdownMenu,
  IconButton,
  Label,
  Prompt,
  Switch,
  Text,
  Textarea,
} from "@medusajs/ui";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type {
  ConversationGetResponseDto,
  ConversationStatus,
} from "@/hooks/api/conversations";
import {
  useUpdateConversationBot,
  useUpdateConversationStatus,
} from "@/hooks/api/conversations";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";

interface Props {
  conversation: ConversationGetResponseDto;
}

function getSenderProfileUrl(
  senderId: string,
  accountType: string,
): string | null {
  switch (accountType) {
    case "FACEBOOK_PAGE":
    case "FACEBOOK_ACCOUNT":
      return `https://business.facebook.com/latest/inbox/messenger?selected_item_id=${senderId}`;
    case "INSTAGRAM_PAGE":
    case "INSTAGRAM_ACCOUNT":
      return `https://business.facebook.com/latest/inbox/instagram?selected_item_id=${senderId}`;
    case "ZALO_PAGE":
    case "ZALO_ACCOUNT":
      return `https://zalo.me/${senderId}`;
    default:
      return null;
  }
}

export const BotPauseSwitch = ({ conversation }: Props) => {
  const { t } = useTranslation();
  const update = useUpdateConversationBot(conversation.id);
  const [pauseReason, setPauseReason] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  if (conversation.status === "RESOLVED") return null;

  const isActive = (conversation as A).botEnabled !== false;

  const handleToggle = (checked: boolean) => {
    if (!checked) {
      triggerRef.current?.click();
    } else {
      update.mutate({ botEnabled: true });
    }
  };

  const handlePauseConfirm = async () => {
    await update.mutateAsync({
      botEnabled: false,
      ...(pauseReason.trim() ? { reason: pauseReason.trim() } : {}),
    });
    setPauseReason("");
  };

  return (
    <div className="flex items-center gap-x-2">
      <Text size="xsmall" className="text-ui-fg-subtle">
        {t("conversations.actions.botLabel")}
      </Text>
      <Switch
        checked={isActive}
        onCheckedChange={handleToggle}
        disabled={update.isPending}
      />
      <Prompt>
        <Prompt.Trigger asChild>
          <button
            ref={triggerRef}
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
        </Prompt.Trigger>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>
              {t("conversations.actions.pauseConfirmTitle")}
            </Prompt.Title>
            <Prompt.Description>
              {t("conversations.actions.pauseConfirmDescription")}
            </Prompt.Description>
          </Prompt.Header>
          <div className="px-6 pb-2 py-4">
            <Label htmlFor="pauseReason" className="mb-2" size="small">
              {t("conversations.actions.pauseReasonLabel")}
            </Label>
            <Textarea
              id="pauseReason"
              rows={3}
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
              placeholder={t("conversations.actions.pauseReasonPlaceholder")}
            />
          </div>
          <Prompt.Footer>
            <Prompt.Cancel onClick={() => setPauseReason("")}>
              {t("conversations.actions.cancel")}
            </Prompt.Cancel>
            <Prompt.Action onClick={handlePauseConfirm}>
              {t("conversations.actions.pause")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </div>
  );
};

export const StatusActionsMenu = ({ conversation }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { workspaceSlug } = useWorkspaceParams();
  const update = useUpdateConversationStatus(conversation.id);
  const resolveRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLButtonElement>(null);

  const apply = async (status: ConversationStatus) => {
    await update.mutateAsync({ status });
  };

  const canResolve = conversation.status !== "RESOLVED";
  const canRestore = conversation.status === "RESOLVED";
  const accountType = (conversation.account as A)?.type as string | undefined;
  const profileUrl = accountType
    ? getSenderProfileUrl(conversation.senderId, accountType)
    : null;
  const chatbotId = (conversation.chatbot as A)?.id as string | undefined;

  return (
    <>
      <DropdownMenu>
        <DropdownMenu.Trigger asChild>
          <IconButton size="small" variant="transparent">
            <EllipsisHorizontal />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          {profileUrl && (
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() =>
                window.open(profileUrl, "_blank", "noopener,noreferrer")
              }
            >
              <ArrowUpRightOnBox />
              {t("conversations.actions.viewProfile")}
            </DropdownMenu.Item>
          )}

          {chatbotId && (
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() => navigate(`/${workspaceSlug}/chatbot/${chatbotId}`)}
            >
              <ArrowUpRightOnBox />
              {t("conversations.actions.viewChatbot")}
            </DropdownMenu.Item>
          )}

          {canResolve && (
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() => resolveRef.current?.click()}
            >
              <CheckCircleSolid />
              {t("conversations.actions.resolve")}
            </DropdownMenu.Item>
          )}
          {canRestore && (
            <DropdownMenu.Item
              className="gap-x-2"
              onClick={() => restoreRef.current?.click()}
            >
              <ArrowUturnLeft />
              {t("conversations.actions.restore")}
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu>

      <Prompt variant="confirmation">
        <Prompt.Trigger asChild>
          <button
            ref={resolveRef}
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
        </Prompt.Trigger>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>
              {t("conversations.actions.resolveConfirmTitle")}
            </Prompt.Title>
            <Prompt.Description>
              {t("conversations.actions.resolveConfirmDescription")}
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>{t("conversations.actions.cancel")}</Prompt.Cancel>
            <Prompt.Action onClick={() => apply("RESOLVED")}>
              <CheckCircleSolid />
              {t("conversations.actions.resolve")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>

      <Prompt>
        <Prompt.Trigger asChild>
          <button
            ref={restoreRef}
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
        </Prompt.Trigger>
        <Prompt.Content>
          <Prompt.Header>
            <Prompt.Title>
              {t("conversations.actions.restoreConfirmTitle")}
            </Prompt.Title>
            <Prompt.Description>
              {t("conversations.actions.restoreConfirmDescription")}
            </Prompt.Description>
          </Prompt.Header>
          <Prompt.Footer>
            <Prompt.Cancel>{t("conversations.actions.cancel")}</Prompt.Cancel>
            <Prompt.Action onClick={() => apply("OPEN")}>
              {t("conversations.actions.restore")}
            </Prompt.Action>
          </Prompt.Footer>
        </Prompt.Content>
      </Prompt>
    </>
  );
};

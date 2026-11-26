import { CheckCircleSolid, Spinner } from "@medusajs/icons";
import { Button, Label, Prompt, Switch, Text, Textarea } from "@medusajs/ui";
import { type ReactElement, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ConversationGetResponseDto } from "@/hooks/api/conversations";
import { useUpdateConversationBot } from "@/hooks/api/conversations";
import { useResolveConversation } from "./use-resolve-conversation";

interface Props {
  conversation: ConversationGetResponseDto;
}

/** Asks before resolving; `children` is the element that opens it. */
const ResolveConfirm = ({
  onConfirm,
  children,
}: {
  onConfirm: () => void;
  children: ReactElement;
}) => {
  const { t } = useTranslation();

  return (
    <Prompt variant="confirmation">
      <Prompt.Trigger asChild>{children}</Prompt.Trigger>
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
          <Prompt.Action onClick={onConfirm}>
            <CheckCircleSolid />
            {t("conversations.actions.resolve")}
          </Prompt.Action>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  );
};

export const BotPauseSwitch = ({ conversation }: Props) => {
  const { t } = useTranslation();
  const update = useUpdateConversationBot(conversation.id);
  const [pauseReason, setPauseReason] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const resolve = useResolveConversation(conversation);

  if (conversation.status === "RESOLVED") return null;

  const isActive = (conversation as A).botEnabled !== false;

  // Handed over (bot off): resolving is how staff give it back to the bot.
  if (!isActive) {
    return (
      <ResolveConfirm onConfirm={() => resolve.resolve()}>
        <Button size="small" variant="secondary" disabled={resolve.isPending}>
          {resolve.isPending ? (
            <Spinner className="animate-spin" />
          ) : (
            <CheckCircleSolid />
          )}
          {t("conversations.actions.resolve")}
        </Button>
      </ResolveConfirm>
    );
  }

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

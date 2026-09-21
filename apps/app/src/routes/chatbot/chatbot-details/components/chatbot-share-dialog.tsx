import { useCreateChatbotShareLink } from "@/hooks/api";
import { useDate } from "@/hooks/use-date";
import { CheckCircleSolid, Share, SquareTwoStack } from "@medusajs/icons";
import {
  Button,
  Drawer,
  Heading,
  IconButton,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui";
import type {
  ChatbotShareLinkRequestDto,
  ChatbotShareLinkResponseDto,
} from "@repo/client";
import { useState } from "react";
import { useTranslation } from "react-i18next";

type Expiry = NonNullable<ChatbotShareLinkRequestDto["expiresIn"]>;

const EXPIRY_OPTIONS: Expiry[] = ["1h", "24h", "7d"];

/**
 * Mints a public preview link for a chatbot. Kept out of `AIChatCard` — the
 * card also renders on the public preview page, which has neither a workspace
 * nor a session to create a link with.
 */
export function ChatbotShareDialog({ chatbotId }: { chatbotId: string }) {
  const { t } = useTranslation();
  const { getFullDate } = useDate();
  const [open, setOpen] = useState(false);
  const [expiresIn, setExpiresIn] = useState<Expiry>("24h");
  const [link, setLink] = useState<ChatbotShareLinkResponseDto | null>(null);
  const [copied, setCopied] = useState(false);

  const { mutateAsync, isPending } = useCreateChatbotShareLink(chatbotId);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      // The token is not stored anywhere, so a reopened drawer starts clean
      // rather than showing a link the operator may already have discarded.
      setLink(null);
      setCopied(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setLink(await mutateAsync({ expiresIn }));
      setCopied(false);
    } catch {
      toast.error(t("chatbot.chat.share.error"));
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    toast.success(t("chatbot.chat.share.copied"));
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <Drawer.Trigger asChild>
        <IconButton
          size="small"
          variant="transparent"
          aria-label={t("chatbot.chat.share.button")}
        >
          <Share />
        </IconButton>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Heading>{t("chatbot.chat.share.title")}</Heading>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-y-4">
          <Text size="small" className="text-ui-fg-subtle">
            {t("chatbot.chat.share.description")}
          </Text>

          <div className="flex flex-col gap-y-2 w-full">
            <Label size="xsmall" weight="plus">
              {t("chatbot.chat.share.expiry")}
            </Label>
            <div className="flex gap-x-2">
              {EXPIRY_OPTIONS.map((option) => (
                <Button
                  key={option}
                  size="small"
                  variant={expiresIn === option ? "primary" : "secondary"}
                  onClick={() => setExpiresIn(option)}
                >
                  {t(`chatbot.chat.share.expiryOptions.${option}`)}
                </Button>
              ))}
            </div>
          </div>

          {link ? (
            <div className="flex flex-col gap-y-2 w-full">
              <div className="flex w-full items-center gap-x-2 [&>div]:min-w-0 [&>div]:flex-1">
                <Input readOnly value={link.url} />
                <IconButton
                  variant="transparent"
                  className="shrink-0"
                  onClick={handleCopy}
                  aria-label={t("chatbot.chat.share.copy")}
                >
                  {copied ? <CheckCircleSolid /> : <SquareTwoStack />}
                </IconButton>
              </div>
              <Text size="xsmall" className="text-ui-fg-muted">
                {t("chatbot.chat.share.expiresAt", {
                  date: getFullDate({
                    date: new Date(link.expiresAt),
                    includeTime: true,
                  }),
                })}
              </Text>
            </div>
          ) : null}
        </Drawer.Body>
        <Drawer.Footer>
          <Button size="small" onClick={handleGenerate} isLoading={isPending}>
            {t("chatbot.chat.share.generate")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

import { Drawer, Text } from "@medusajs/ui";
import { MessageResponse } from "@repo/ui/common-components";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type ChatbotPromptDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The compiled prompt the model reads, in English. */
  prompt: string;
};

/** The full compiled prompt, read-only: edits go through the builder. */
export const ChatbotPromptDrawer: FC<ChatbotPromptDrawerProps> = ({
  open,
  onOpenChange,
  prompt,
}) => {
  const { t } = useTranslation();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("agentBuilder.ui.showFullPrompt")}</Drawer.Title>
          <Drawer.Description asChild>
            <Text size="small" className="text-ui-fg-subtle">
              {t("agentBuilder.ui.promptSummaryIntro")}
            </Text>
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          <MessageResponse>{prompt}</MessageResponse>
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  );
};

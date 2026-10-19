import { LegalText } from "@/components/common";
import { Text } from "@medusajs/ui";
import type { FC } from "react";

type WidgetAiNoticeProps = {
  /** The business's own privacy policy; Ecbot's processor notice otherwise. */
  privacyPolicyUrl?: string;
  /** Staff have taken over the conversation, so no AI is answering now. */
  staffActive?: boolean;
};

/**
 * Tells the visitor who answers them (the AI, or a staff member once one has
 * taken over), with a link to the privacy policy.
 */
export const WidgetAiNotice: FC<WidgetAiNoticeProps> = ({
  privacyPolicyUrl,
  staffActive,
}) => (
  <Text size="xsmall" className="text-ui-fg-muted px-4 pt-2 text-center">
    <LegalText
      i18nKey={staffActive ? "widget.staffNotice" : "widget.aiNotice"}
      privacyUrl={privacyPolicyUrl}
    />
  </Text>
);

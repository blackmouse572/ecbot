import { LegalText } from "@/components/common";
import { Text } from "@medusajs/ui";
import type { FC } from "react";

type WidgetAiNoticeProps = {
  /** The business's own privacy policy; Ecbot's processor notice otherwise. */
  privacyPolicyUrl?: string;
};

/** Tells the visitor an AI answers them, with a link to the privacy policy. */
export const WidgetAiNotice: FC<WidgetAiNoticeProps> = ({
  privacyPolicyUrl,
}) => (
  <Text size="xsmall" className="text-ui-fg-muted px-4 pt-2 text-center">
    <LegalText i18nKey="widget.aiNotice" privacyUrl={privacyPolicyUrl} />
  </Text>
);

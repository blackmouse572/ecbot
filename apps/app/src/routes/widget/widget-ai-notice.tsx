import { LegalText } from "@/components/common";
import { Text } from "@medusajs/ui";

/** Tells the visitor an AI answers them, with a link to the privacy policy. */
export function WidgetAiNotice() {
  return (
    <Text size="xsmall" className="text-ui-fg-muted px-4 pt-2 text-center">
      <LegalText i18nKey="widget.aiNotice" />
    </Text>
  );
}

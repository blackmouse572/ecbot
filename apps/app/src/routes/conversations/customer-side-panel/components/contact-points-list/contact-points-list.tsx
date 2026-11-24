import type { ContactPointGetResponseDto } from "@/hooks/api/contact-points";
import { PlatformIcon } from "@/components/platform-icon/platform-icon";
import { Text } from "@medusajs/ui";
import { NoRecords } from "@repo/ui/common-components";
import { IconAddressBook } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";

export function ContactPointsList({
  contactPoints,
}: {
  contactPoints: ContactPointGetResponseDto[];
}) {
  const { t } = useTranslation();

  if (contactPoints.length === 0) {
    return (
      <NoRecords
        size="small"
        title={t("conversations.customer.panel.contactPoints.empty")}
        message={t("conversations.customer.panel.contactPoints.emptyHint")}
        icon={<IconAddressBook />}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-y-2">
      {contactPoints.map((cp) => (
        <li
          key={cp.id}
          className="border-ui-border-base bg-ui-bg-base flex items-center gap-x-2 rounded border px-2 py-1.5"
        >
          <PlatformIcon
            type={cp.platform as A}
            size={16}
            className="shrink-0"
          />
          <div className="flex min-w-0 flex-col">
            <Text size="small" weight="plus" className="truncate">
              {cp.displaySenderName ?? cp.externalSenderId}
            </Text>
            {cp.displaySenderName && (
              <Text size="xsmall" className="text-ui-fg-subtle truncate">
                {cp.externalSenderId}
              </Text>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

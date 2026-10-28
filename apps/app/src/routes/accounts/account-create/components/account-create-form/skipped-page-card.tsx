import { getAvatarFallback } from "@/components/utils/avatar-fallback";
import { Avatar, Container, StatusBadge, Text, Tooltip } from "@medusajs/ui";
import type { AccountLinkSkippedPageResponseDto } from "@repo/client";
import { useTranslation } from "react-i18next";

/** A Page the login manages that another workspace has already connected. */
export function SkippedPageCard({
  page,
}: {
  page: AccountLinkSkippedPageResponseDto;
}) {
  const { t } = useTranslation();
  return (
    <Container className="flex gap-4 items-center">
      <Avatar
        src={page.avatar}
        size="large"
        fallback={getAvatarFallback(page.name)}
      />
      <div className="flex flex-col justify-center flex-1">
        <Text size="base">{page.name}</Text>
        <Text size="small" className="text-ui-fg-subtle">
          {page.type}
        </Text>
      </div>
      <Tooltip content={t("accounts.link.success.linkedElsewhere")}>
        <StatusBadge color="red" className="h-fit cursor-help">
          {t("accounts.link.success.failed")}
        </StatusBadge>
      </Tooltip>
    </Container>
  );
}

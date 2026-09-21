import { AccountActions } from "@/routes/accounts/accounts-list/components/account-list-table";
import { AccountStatusCell } from "@/routes/accounts/accounts-list/components/account-list-table/account-status-cell";
import { Container, Heading, Text } from "@medusajs/ui";
import type { AccountGetDetailResponseDto } from "@repo/client";

type AccountGeneralSectionProps = {
  item: AccountGetDetailResponseDto;
};

export const AccountGeneralSection = ({ item }: AccountGeneralSectionProps) => {
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col gap-y-1">
          <Heading>{item.name}</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-muted">
            {item.link}
          </Text>
        </div>
        <div className="flex items-center gap-x-4">
          <AccountStatusCell status={item.status} />
          <AccountActions item={item} />
        </div>
      </div>
    </Container>
  );
};

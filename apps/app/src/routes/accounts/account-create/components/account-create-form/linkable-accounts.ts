import { isPersonalAccountType } from "@/routes/chatbot/chatbot-create/agent-builder/channel-accounts";
import type { AccountGetDetailResponseDto } from "@repo/client";

export type LinkableAccount = Pick<
  AccountGetDetailResponseDto,
  "id" | "type" | "name"
>;

/** The channels an agent can answer on; a personal profile only parents its pages. */
export const linkableAccounts = (accounts: LinkableAccount[]) =>
  accounts.filter((account) => !isPersonalAccountType(account.type));

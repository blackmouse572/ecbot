import { contactPointWorkspaceControllerListByCustomerV1 } from "@repo/client";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export const CONTACT_POINT_QUERY_KEY = "contact-point" as const;

export type ContactPointGetResponseDto = {
  id: string;
  platform: string;
  externalSenderId: string;
  displaySenderName?: string | null;
  senderAvatar?: string | null;
  fetchedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export const contactPointQueryKeys = {
  all: [CONTACT_POINT_QUERY_KEY] as const,
  byCustomer: (customerId: string) =>
    [CONTACT_POINT_QUERY_KEY, "by-customer", customerId] as const,
};

export const useContactPointsByCustomer = (
  customerId: string | undefined | null,
) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: contactPointQueryKeys.byCustomer(customerId ?? ""),
    enabled: !!slug && !!customerId,
    queryFn: () =>
      contactPointWorkspaceControllerListByCustomerV1({
        path: { workspace: slug! },
        query: { customer: customerId! },
      }).then((res) => res.data?.data ?? []),
  });

  return {
    ...rest,
    contactPoints: data ?? [],
  };
};

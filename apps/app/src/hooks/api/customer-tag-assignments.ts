import {
  customerTagAssignmentWorkspaceControllerApplyV1,
  customerTagAssignmentWorkspaceControllerListV1,
  customerTagAssignmentWorkspaceControllerRemoveV1,
} from "@repo/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CustomerTagGetResponseDto } from "./customer-tags";
import { useWorkspace } from "./workspace";

export const CUSTOMER_TAG_ASSIGNMENT_QUERY_KEY =
  "customer-tag-assignment" as const;

export type CustomerTagAssignmentGetResponseDto = {
  id: string;
  tag: CustomerTagGetResponseDto;
  createdAt: string;
  updatedAt?: string;
};

export const customerTagAssignmentQueryKeys = {
  all: [CUSTOMER_TAG_ASSIGNMENT_QUERY_KEY] as const,
  byCustomer: (customerId: string) =>
    [CUSTOMER_TAG_ASSIGNMENT_QUERY_KEY, "by-customer", customerId] as const,
};

export const useCustomerTagAssignments = (
  customerId: string | undefined | null,
) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: customerTagAssignmentQueryKeys.byCustomer(customerId ?? ""),
    enabled: !!slug && !!customerId,
    queryFn: () =>
      customerTagAssignmentWorkspaceControllerListV1({
        path: { workspace: slug!, customerId: customerId! },
      }).then(
        (res) =>
          (res.data
            ?.data as unknown as CustomerTagAssignmentGetResponseDto[]) ?? [],
      ),
  });

  return {
    ...rest,
    assignments: data ?? [],
  };
};

export const useApplyCustomerTag = (customerId: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) =>
      customerTagAssignmentWorkspaceControllerApplyV1({
        path: { workspace: slug!, customerId: customerId!, tagId },
      }).then(
        (res) =>
          res.data?.data as unknown as CustomerTagAssignmentGetResponseDto,
      ),
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: customerTagAssignmentQueryKeys.byCustomer(customerId),
        });
      }
    },
  });
};

export const useRemoveCustomerTag = (customerId: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tagId: string) =>
      customerTagAssignmentWorkspaceControllerRemoveV1({
        path: { workspace: slug!, customerId: customerId!, tagId },
      }),
    onSuccess: () => {
      if (customerId) {
        queryClient.invalidateQueries({
          queryKey: customerTagAssignmentQueryKeys.byCustomer(customerId),
        });
      }
    },
  });
};

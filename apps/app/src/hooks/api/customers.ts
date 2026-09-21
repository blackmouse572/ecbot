import { queryKeysFactory } from "@/libs/query-factory";
import {
  customerWorkspaceControllerGetV1,
  customerWorkspaceControllerUpdateV1,
} from "@repo/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export const CUSTOMER_QUERY_KEY = "customer" as const;

export type CustomerGetResponseDto = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: string | null;
  notes?: string | null;
  profileSummary?: string | null;
  mergedIntoCustomerId?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type CustomerUpdateRequestDto = {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: string | null;
  notes?: string | null;
  profileSummary?: string | null;
};

export const customerQueryKeys = {
  ...queryKeysFactory<typeof CUSTOMER_QUERY_KEY, never>(CUSTOMER_QUERY_KEY),
};

export const useCustomer = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: customerQueryKeys.detail(id ?? ""),
    enabled: !!slug && !!id,
    queryFn: () =>
      customerWorkspaceControllerGetV1({
        path: { workspace: slug!, id: id! },
      }).then((res) => res.data?.data as CustomerGetResponseDto),
  });

  return { ...rest, customer: data as CustomerGetResponseDto | undefined };
};

export const useUpdateCustomer = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CustomerUpdateRequestDto) =>
      customerWorkspaceControllerUpdateV1({
        path: { workspace: slug!, id: id! },
        body,
      }).then((res) => res.data?.data as CustomerGetResponseDto),
    onSuccess: () => {
      if (id) {
        queryClient.invalidateQueries({
          queryKey: customerQueryKeys.detail(id),
        });
      }
    },
  });
};

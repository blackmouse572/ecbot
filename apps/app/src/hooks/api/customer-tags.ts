import { queryKeysFactory } from "@/libs/query-factory";
import {
  client,
  customerTagWorkspaceControllerCreateV1,
  customerTagWorkspaceControllerDeleteV1,
  customerTagWorkspaceControllerGetV1,
  customerTagWorkspaceControllerListV1,
  customerTagWorkspaceControllerUpdateV1,
} from "@repo/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "./workspace";

export const CUSTOMER_TAG_QUERY_KEY = "customer-tag" as const;

export type CustomerTagGetResponseDto = {
  id: string;
  name: string;
  emoji?: string | null;
  description?: string | null;
  triggersHandoff: boolean;
  createdAt: string;
  updatedAt?: string;
};

export type CustomerTagCreateRequestDto = {
  name: string;
  emoji?: string | null;
  description?: string | null;
  triggersHandoff?: boolean;
};

export type CustomerTagUpdateRequestDto = {
  name?: string;
  emoji?: string | null;
  description?: string | null;
  triggersHandoff?: boolean;
};

export const customerTagQueryKeys = {
  ...queryKeysFactory<typeof CUSTOMER_TAG_QUERY_KEY>(CUSTOMER_TAG_QUERY_KEY),
};

export const useCustomerTagList = () => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: customerTagQueryKeys.list(),
    enabled: !!slug,
    queryFn: () =>
      customerTagWorkspaceControllerListV1({
        path: { workspace: slug! },
      }).then(
        (res) => ((res.data as A)?.data as CustomerTagGetResponseDto[]) ?? [],
      ),
  });

  return {
    ...rest,
    tags: (data as CustomerTagGetResponseDto[] | undefined) ?? [],
  };
};

export const useCustomerTag = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;

  const { data, ...rest } = useQuery({
    queryKey: customerTagQueryKeys.detail(id ?? ""),
    enabled: !!slug && !!id,
    queryFn: () =>
      customerTagWorkspaceControllerGetV1({
        path: { workspace: slug!, customerTag: id! },
      }).then((res) => (res.data as A)?.data as CustomerTagGetResponseDto),
  });

  return {
    ...rest,
    tag: data as CustomerTagGetResponseDto | undefined,
  };
};

export const useCreateCustomerTag = () => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CustomerTagCreateRequestDto) =>
      customerTagWorkspaceControllerCreateV1({
        path: { workspace: workspace!.slug },
        body: body as A,
        throwOnError: true,
      }).then((res) => (res.data as A)?.data as CustomerTagGetResponseDto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerTagQueryKeys.lists(),
      });
    },
  });
};

export const useUpdateCustomerTag = (id: string | undefined | null) => {
  const { workspace } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CustomerTagUpdateRequestDto) =>
      customerTagWorkspaceControllerUpdateV1({
        path: { workspace: workspace!.slug, customerTag: id! },
        body: body as A,
        throwOnError: true,
      }).then((res) => (res.data as A)?.data as CustomerTagGetResponseDto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerTagQueryKeys.lists(),
      });
      if (id) {
        queryClient.invalidateQueries({
          queryKey: customerTagQueryKeys.detail(id),
        });
      }
    },
  });
};

export const useDeleteCustomerTag = () => {
  const { workspace } = useWorkspace();
  const slug = workspace?.slug;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      customerTagWorkspaceControllerDeleteV1({
        path: { workspace: slug!, customerTag: id },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: customerTagQueryKeys.lists(),
      });
    },
  });
};

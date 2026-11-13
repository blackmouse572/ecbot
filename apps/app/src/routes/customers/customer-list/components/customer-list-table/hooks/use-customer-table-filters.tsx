import {
  CUSTOMER_PERMISSIONS,
  CUSTOMER_STAGES,
} from "@/components/customer-marketing";
import type { Filter } from "@/components/table/data-table";
import {
  trackedLinkListQueryOptions,
  useTrackedLink,
  type TrackedLinkGetResponseDto,
} from "@/hooks/api/tracked-links";
import { useWorkspaceParams } from "@/hooks/use-workspace-params";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useDebounceCallback } from "usehooks-ts";

const SOURCE_SEARCH_DELAY_MS = 300;

/** Giai đoạn, Nhận ưu đãi, Lâu không nhắn and Nguồn facets above the customer table. */
export const useCustomerTableFilters = (): Filter[] => {
  const { t } = useTranslation();
  const { workspaceSlug } = useWorkspaceParams();
  const [searchParams] = useSearchParams();
  const [sourceSearch, setSourceSearch] = useState("");
  const onSourceSearch = useDebounceCallback(
    setSourceSearch,
    SOURCE_SEARCH_DELAY_MS,
  );
  // The server searches every source by name and code; the API's largest
  // page holds the matches. The last matches stay while the next load.
  const { data } = useQuery({
    ...trackedLinkListQueryOptions(workspaceSlug, {
      perPage: 100,
      search: sourceSearch || undefined,
    }),
    enabled: !!workspaceSlug,
    placeholderData: keepPreviousData,
  });
  // ResponsePagingDto types `data` as loose records; narrow to the link shape.
  const matches: TrackedLinkGetResponseDto[] = data?.data ?? [];

  // The picked source may not be among the matches; fetch it for its name.
  const pickedId = searchParams.get("source") ?? "";
  const pickedMissing = !!pickedId && !matches.some((l) => l.id === pickedId);
  const { link: picked } = useTrackedLink(
    workspaceSlug,
    pickedMissing ? pickedId : "",
  );
  const sources = useMemo(
    () => (pickedMissing && picked ? [picked, ...matches] : matches),
    [pickedMissing, picked, matches],
  );

  return useMemo<Filter[]>(
    () => [
      {
        key: "stage",
        label: t("customers.list.stage"),
        type: "select",
        multiple: true,
        options: CUSTOMER_STAGES.map((value) => ({
          value,
          label: t(`customerMarketing.stage.${value}`),
        })),
      },
      {
        key: "permission",
        label: t("customers.list.permission"),
        type: "select",
        multiple: true,
        options: CUSTOMER_PERMISSIONS.map((value) => ({
          value,
          label: t(`customerMarketing.permission.${value}`),
        })),
      },
      {
        key: "dormant",
        label: t("customers.list.dormant"),
        type: "select",
        options: ["true", "false"].map((value) => ({
          value,
          label: t(`customers.list.dormantOptions.${value}`),
        })),
      },
      {
        key: "source",
        label: t("customers.list.source"),
        type: "select",
        searchable: true,
        onSearchChange: onSourceSearch,
        options: sources.map((link) => ({ value: link.id, label: link.name })),
      },
    ],
    [t, sources, onSourceSearch],
  );
};

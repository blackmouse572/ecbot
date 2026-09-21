import { accountsQueryOptions } from "@/hooks/api";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import { getQueryParams } from "@repo/ui/hooks";
import type { LoaderFunctionArgs } from "react-router-dom";
import {
  ACCOUNTS_PAGE_SIZE,
  ACCOUNT_TABLE_PARAMS,
  toAccountListQuery,
} from "./components/account-list-table";

/** Warms the accounts list cache with the query the table is about to run. */
export const accountsLoader = ({ params, request }: LoaderFunctionArgs) => {
  const { workspaceSlug } = getWorkspaceParams(params);
  const urlParams = new URL(request.url).searchParams;
  const raw = getQueryParams(urlParams, ACCOUNT_TABLE_PARAMS);
  const { searchParams } = toAccountListQuery(raw, ACCOUNTS_PAGE_SIZE);

  return queryClient.ensureQueryData(
    accountsQueryOptions(workspaceSlug, searchParams),
  );
};

import { workspaceMemberListQueryOptions } from "@/hooks/api";
import queryClient from "@/libs/query-client";
import { getWorkspaceParams } from "@/libs/workspace-params";
import { getQueryParams } from "@repo/ui/hooks";
import type { LoaderFunctionArgs } from "react-router-dom";
import {
  MEMBERS_PAGE_SIZE,
  MEMBER_TABLE_PARAMS,
  toMemberListQuery,
} from "./components/account-list-table";

/** Warms the members list cache with the same query the table will run. */
export const membersLoader = ({ params, request }: LoaderFunctionArgs) => {
  const { workspaceSlug } = getWorkspaceParams(params);
  const urlParams = new URL(request.url).searchParams;
  const raw = getQueryParams(urlParams, MEMBER_TABLE_PARAMS);
  const { searchParams } = toMemberListQuery(raw, MEMBERS_PAGE_SIZE);
  const query = workspaceMemberListQueryOptions(workspaceSlug, searchParams);

  return queryClient.ensureQueryData(query);
};

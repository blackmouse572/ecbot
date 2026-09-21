import { meQueryOptions } from "@/hooks/api";
import {
  workspaceDetailsQueryOptions,
  workspaceListQueryOptions,
} from "@/hooks/api/workspace";
import queryClient from "@/libs/query-client";
import type { LoaderFunctionArgs } from "react-router-dom";

const prefetchApis = (param: Record<string, A>) => {
  return Promise.all([
    queryClient.prefetchQuery(meQueryOptions(param.workspaceSlug)),
    queryClient.prefetchQuery(workspaceListQueryOptions),
    queryClient.prefetchQuery(
      workspaceDetailsQueryOptions(param.workspaceSlug),
    ),
  ]);
};
export async function loader({ params }: LoaderFunctionArgs) {
  await prefetchApis(params);
}

import { skillDetailQueryOptions } from "@/hooks/api/skills";
import queryClient from "@/libs/query-client";
import type { LoaderFunctionArgs } from "react-router-dom";

export async function skillDetailLoader({ params }: LoaderFunctionArgs) {
  const { workspaceSlug, skillId } = params;
  if (!workspaceSlug || !skillId) {
    throw new Error("workspaceSlug and skillId are required");
  }
  return queryClient.ensureQueryData(
    skillDetailQueryOptions(workspaceSlug, skillId),
  );
}

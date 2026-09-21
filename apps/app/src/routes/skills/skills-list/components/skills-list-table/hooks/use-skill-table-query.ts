import { useQueryParams } from "@repo/ui/hooks";
import type { SkillSource } from "@/hooks/api/skills";
import { SKILL_QUERY_PARAMS } from "@/routes/skills/constants";

type UseSkillTableQueryProps = {
  prefix?: string;
  pageSize?: number;
};

export const useSkillTableQuery = ({
  prefix,
  pageSize = 20,
}: UseSkillTableQueryProps) => {
  const queryObject = useQueryParams(SKILL_QUERY_PARAMS, prefix);

  const { search, source, page } = queryObject;

  const searchParams = {
    perPage: pageSize,
    page: page ? Number(page) : 1,
    search: search || undefined,
    source: (source as SkillSource) || undefined,
  };

  return {
    searchParams,
    raw: queryObject,
  };
};

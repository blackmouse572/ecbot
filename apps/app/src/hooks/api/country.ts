import { queryKeysFactory } from "@/libs/query-factory";
import type { RequestPaginationDto } from "@/libs/query-types";
import {
  countrySystemControllerListV1,
  countrySharedControllerListPublicV1,
  type CountrySharedControllerListPublicV1Response,
  type CountryListResponseDto,
  type CountrySystemControllerListV1Error,
  type CountrySharedControllerListPublicV1Errors,
  type CountrySystemControllerListV1Response,
} from "@repo/client";
import {
  useQuery,
  type QueryKey,
  type UseQueryOptions,
} from "@tanstack/react-query";

export const COUNTRY_QUERY_KEY = "countries" as const;
export const countryQueryKeys = queryKeysFactory(COUNTRY_QUERY_KEY);

export const useCountriesSystem = (
  query?: Partial<RequestPaginationDto>,
  options?: Omit<
    UseQueryOptions<
      CountrySystemControllerListV1Response,
      CountrySystemControllerListV1Error,
      CountrySystemControllerListV1Response,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, isError, error, ...rest } = useQuery({
    queryKey: countryQueryKeys.list(query),
    placeholderData: options?.placeholderData as A,
    initialData: options?.initialData as A,
    queryFn: () =>
      countrySystemControllerListV1({ query }).then((res) => res.data ?? null),
  });

  return {
    ...rest,
    isError,
    error,
    countries: data?.data as Array<CountryListResponseDto> | undefined,
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

export const useCountriesShare = (
  query?: Partial<RequestPaginationDto>,
  options?: Omit<
    UseQueryOptions<
      CountrySharedControllerListPublicV1Response,
      CountrySharedControllerListPublicV1Errors,
      CountrySharedControllerListPublicV1Response,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >,
) => {
  const { data, isError, error, ...rest } = useQuery({
    queryKey: countryQueryKeys.list(query),
    placeholderData: options?.placeholderData as A,
    initialData: options?.initialData as A,
    queryFn: () =>
      countrySharedControllerListPublicV1({ query }).then(
        (res) => res.data ?? null,
      ),
  });

  return {
    ...rest,
    isError,
    error,
    countries: data?.data as Array<CountryListResponseDto> | undefined,
    count: data?._metadata?.pagination?.total ?? 0,
  };
};

/**
 * Every country, for pickers such as sign-up. The API caps a page at 100, so
 * this follows the pages until the last one. Countries rarely change, so the
 * list is kept for the whole session.
 */
export const useAllCountriesShare = () => {
  const { data, ...rest } = useQuery({
    queryKey: countryQueryKeys.list({ all: true }),
    staleTime: Infinity,
    queryFn: async () => {
      const countries: CountryListResponseDto[] = [];
      for (let page = 1; ; page++) {
        const res = await countrySharedControllerListPublicV1({
          query: { page, perPage: 100 },
        });
        const body = res.data as CountrySharedControllerListPublicV1Response;
        const rows = (body?.data ?? []) as CountryListResponseDto[];
        countries.push(...rows);
        const totalPage = body?._metadata?.pagination?.totalPage ?? 1;
        if (rows.length === 0 || page >= totalPage) break;
      }
      return countries.sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  return { ...rest, countries: data };
};

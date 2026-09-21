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

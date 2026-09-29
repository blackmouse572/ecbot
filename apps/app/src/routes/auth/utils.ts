import type { CountryListResponseDto } from "@repo/client";
import { VIETNAM_ALPHA2_CODE } from "./constants";

/** The sign-up country to preselect: Vietnam for the Vietnamese UI. */
export function signupDefaultCountryId(
  countries: CountryListResponseDto[],
  locale: string,
): string | undefined {
  if (locale !== "vi") return undefined;
  return countries.find((c) => c.alpha2Code === VIETNAM_ALPHA2_CODE)?.id;
}

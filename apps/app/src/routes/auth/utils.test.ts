import type { CountryListResponseDto } from "@repo/client";
import { describe, expect, it } from "vitest";
import { signupDefaultCountryId } from "./utils";

const countries = [
  { id: "id-1", alpha2Code: "ID", name: "Indonesia" },
  { id: "vn-1", alpha2Code: "VN", name: "Vietnam" },
] as CountryListResponseDto[];

describe("signupDefaultCountryId", () => {
  it("preselects Vietnam for the Vietnamese UI", () => {
    expect(signupDefaultCountryId(countries, "vi")).toBe("vn-1");
  });

  it("leaves the country empty for other languages", () => {
    expect(signupDefaultCountryId(countries, "en")).toBeUndefined();
  });

  it("leaves it empty when Vietnam is not in the list", () => {
    expect(signupDefaultCountryId(countries.slice(0, 1), "vi")).toBeUndefined();
  });
});

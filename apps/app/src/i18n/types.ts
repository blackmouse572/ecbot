import type { Locale } from "date-fns";
import type { resources } from ".";

export type Resources = typeof resources;

type TLocaleCode = "en" | "vi";

export type Language = {
  code: TLocaleCode;
  display_name: string;
  ltr: boolean;
  date_locale: Locale;
};

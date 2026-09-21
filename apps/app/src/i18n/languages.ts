import { enUS, vi } from "date-fns/locale";
import type { Language } from "./types";

export const languages: Language[] = [
  {
    code: "en",
    display_name: "English",
    ltr: true,
    date_locale: enUS,
  },
  {
    code: "vi",
    display_name: "Tiếng Việt",
    ltr: true,
    date_locale: vi,
  },
];

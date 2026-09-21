import "i18next";
import { defaultNs } from "./i18n";
import type { Resources } from "./i18n/types";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNs;
    // resources: Resources['en'] | Resources['vi'];
  }
}

import * as z from "zod";

export type TLocaleCode = "en" | "vi";

async function loadZodLocaleAsync(localeCode: TLocaleCode) {
  // ! Can not use dynamic import here due to the way zod is bundled
  // ! This is a workaround to load the locale dynamically
  // TODO: Use a more robust solution for dynamic imports if needed (for better tree-shaking or performance)
  // const { default: locale } = await import(`zod/v4/locales/${localeCode}.js`);
  let locale: any;
  z.config(locale);
}

function loadZodLocale(localeCode: TLocaleCode) {
  let locale: any;
  switch (localeCode) {
    case "en":
      locale = z.locales.en();
      break;
    case "vi":
      locale = z.locales.vi();
      break;
    default:
      throw new Error(`Unsupported locale: ${localeCode}`);
  }
  z.config(locale);
}

export { loadZodLocale };

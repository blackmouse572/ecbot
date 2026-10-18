/** A language code's name in the viewer's locale, e.g. "vi" -> "Tiếng Việt". */
export const languageName = (code: string, locale: string): string => {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code
    );
  } catch {
    return code;
  }
};

import { loadZodLocale, type TLocaleCode } from "../utils";

interface ZodFormWrapperProps extends React.PropsWithChildren {
  locale: TLocaleCode;
}

const ZodFormWrapper = ({ locale, children }: ZodFormWrapperProps) => {
  loadZodLocale(locale);
  return <>{children}</>;
};

export { ZodFormWrapper };

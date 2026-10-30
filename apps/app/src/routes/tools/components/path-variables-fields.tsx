import { Input, Label } from "@medusajs/ui";
import { pathParamNames } from "@repo/agent-blueprint";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type PathVariablesFieldsProps = {
  url: string;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
};

/** One input per `{name}` in the URL path, for a test run. */
export const PathVariablesFields: FC<PathVariablesFieldsProps> = ({
  url,
  values,
  onChange,
}) => {
  const { t } = useTranslation();
  const names = [...new Set(pathParamNames(url))];
  if (names.length === 0) return null;

  return (
    <div className="flex flex-col gap-y-1">
      <span className="txt-compact-small text-ui-fg-subtle">
        {t("tools.test.variablesLabel")}
      </span>
      <div className="flex flex-col divide-y divide-ui-border-base rounded-md border border-ui-border-base">
        {names.map((name) => (
          <div
            key={name}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-center gap-x-3 px-3 py-2"
          >
            <Label
              htmlFor={`path-var-${name}`}
              size="small"
              className="font-mono break-all"
            >
              {name}
            </Label>
            <Input
              id={`path-var-${name}`}
              size="small"
              value={values[name] ?? ""}
              placeholder={t("tools.test.variablePlaceholder")}
              onChange={(e) => onChange({ ...values, [name]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

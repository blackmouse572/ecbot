import { Input, Label } from "@medusajs/ui";
import { pathParamNames } from "@repo/agent-blueprint";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type PathVariablesFieldsProps = {
  url: string;
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  /** Names to mark Required (after a test run was tried without them). */
  missing?: string[];
};

/** One input per `{name}` in the URL path, for a test run. */
export const PathVariablesFields: FC<PathVariablesFieldsProps> = ({
  url,
  values,
  onChange,
  missing = [],
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
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] items-start gap-x-3 px-3 py-2"
          >
            <Label
              htmlFor={`path-var-${name}`}
              size="small"
              className="font-mono break-all pt-1.5"
            >
              {name}
            </Label>
            <div className="flex flex-col gap-y-1">
              <Input
                id={`path-var-${name}`}
                size="small"
                value={values[name] ?? ""}
                placeholder={t("tools.test.variablePlaceholder")}
                aria-invalid={missing.includes(name) || undefined}
                aria-describedby={
                  missing.includes(name) ? `path-var-${name}-error` : undefined
                }
                onChange={(e) =>
                  onChange({ ...values, [name]: e.target.value })
                }
              />
              {missing.includes(name) && (
                <span
                  id={`path-var-${name}-error`}
                  className="txt-compact-xsmall text-ui-fg-error"
                >
                  {t("tools.test.variableRequired")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

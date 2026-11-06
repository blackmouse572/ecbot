import { Label, RadioGroup } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { ROLE_ACCESS_LEVELS, ROLE_SUBJECTS } from "../../constants";
import type { RoleFormData } from "../../schemas";

type Permission = RoleFormData["permissions"][number];
type AccessLevel = (typeof ROLE_ACCESS_LEVELS)[number]["value"];

interface PermissionsFieldProps {
  value: RoleFormData["permissions"];
  onChange: (value: RoleFormData["permissions"]) => void;
}

const accessOf = (permission?: Permission): AccessLevel => {
  if (!permission) return "none";
  return permission.action.includes("manage") ? "full" : "view";
};

/** One row per area: no access, view only, or full access. */
export function PermissionsField({
  value = [],
  onChange,
}: PermissionsFieldProps) {
  const { t } = useTranslation();

  const setAccess = (subject: Permission["subject"], level: AccessLevel) => {
    const rest = value.filter((p) => p.subject !== subject);
    const action = ROLE_ACCESS_LEVELS.find((l) => l.value === level)!.action;

    onChange(
      action.length ? [...rest, { subject, action: [...action] }] : rest,
    );
  };

  return (
    <div className="divide-ui-border-base flex flex-col divide-y rounded-lg border">
      {ROLE_SUBJECTS.map((subject) => {
        const area = t(subject.labelKey);
        const current = accessOf(
          value.find((p) => p.subject === subject.value),
        );

        return (
          <div
            key={subject.value}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
          >
            <Label id={`access-${subject.value}`} size="small" weight="plus">
              {area}
            </Label>
            <RadioGroup
              aria-labelledby={`access-${subject.value}`}
              value={current}
              onValueChange={(level) =>
                setAccess(subject.value, level as AccessLevel)
              }
              className="flex flex-wrap gap-x-4 gap-y-2"
            >
              {ROLE_ACCESS_LEVELS.map((level) => {
                const id = `access-${subject.value}-${level.value}`;

                return (
                  <div key={level.value} className="flex items-center gap-x-2">
                    <RadioGroup.Item
                      id={id}
                      value={level.value}
                      aria-label={`${area}: ${t(level.labelKey)}`}
                    />
                    <Label htmlFor={id} size="small">
                      {t(level.labelKey)}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </div>
        );
      })}
    </div>
  );
}

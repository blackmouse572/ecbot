import { Badge, Checkbox, Heading, Label } from "@medusajs/ui";
import { useTranslation } from "react-i18next";
import { ROLE_SUBJECTS } from "../../constants";
import type { RoleFormData } from "../../schemas";

interface PermissionsFieldProps {
  value: RoleFormData["permissions"];
  onChange: (value: RoleFormData["permissions"]) => void;
}

export function PermissionsField({
  value = [],
  onChange,
}: PermissionsFieldProps) {
  const { t } = useTranslation();

  // Get currently selected subjects
  const selectedSubjects = value.map((p) => p.subject);

  const handleSubjectToggle = (subject: string, checked: boolean) => {
    if (checked) {
      // Add new permission with "manage" action
      const newPermission = {
        subject: subject as A,
        action: ["manage"] as A,
      };
      onChange([...value, newPermission]);
    } else {
      // Remove permission for this subject
      onChange(value.filter((p) => p.subject !== subject));
    }
  };

  return (
    <div className="space-y-4">
      <Heading level="h3" className="text-sm font-medium">
        {t("roles.permissions.selectSubjects", "Select Permissions")}
      </Heading>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {ROLE_SUBJECTS.map((subject) => (
          <div key={subject.value} className="flex items-center space-x-2">
            <Checkbox
              id={`subject-${subject.value}`}
              checked={selectedSubjects.includes(subject.value)}
              onCheckedChange={(checked) =>
                handleSubjectToggle(subject.value, checked as boolean)
              }
            />
            <Label
              htmlFor={`subject-${subject.value}`}
              className="text-sm cursor-pointer"
            >
              {t(subject.labelKey)}
            </Label>
          </div>
        ))}
      </div>

      {/* Show selected permissions */}
      {value.length > 0 && (
        <div className="space-y-2">
          <Heading level="h3" className="text-sm font-medium">
            {t("roles.permissions.selected", "Selected Permissions")}
          </Heading>

          <div className="flex flex-wrap gap-2">
            {value.map((permission, index) => (
              <Badge key={index} size="small">
                {t(
                  ROLE_SUBJECTS.find((s) => s.value === permission.subject)
                    ?.labelKey ?? permission.subject,
                )}{" "}
                - Manage
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

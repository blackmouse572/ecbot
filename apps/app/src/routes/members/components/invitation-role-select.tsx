import { clx, Select } from "@medusajs/ui";
import type { FC } from "react";
import { useTranslation } from "react-i18next";
import { useInvitableRoles } from "../hooks/use-invitable-roles";
import { useRoleLabel } from "../hooks/use-role-label";

type InvitationRoleSelectProps = {
  /** Role id; empty when the invitation has none (accept grants Sales). */
  value?: string;
  onValueChange: (roleId: string) => void;
  className?: string;
};

/** Picks an invitation's role. Owner is never offered. */
export const InvitationRoleSelect: FC<InvitationRoleSelectProps> = ({
  value,
  onValueChange,
  className,
}) => {
  const { t } = useTranslation();
  const { roles } = useInvitableRoles();
  const roleLabel = useRoleLabel();

  return (
    <Select value={value || undefined} onValueChange={onValueChange}>
      <Select.Trigger
        aria-label={t("fields.role")}
        className={clx("[&>span]:truncate", className)}
      >
        <Select.Value placeholder={t("members.invitations.defaultRole")} />
      </Select.Trigger>
      <Select.Content>
        {roles.map((role) => {
          const { label } = roleLabel(role);

          return (
            <Select.Item key={role.id} value={role.id} textValue={label}>
              {label}
            </Select.Item>
          );
        })}
      </Select.Content>
    </Select>
  );
};

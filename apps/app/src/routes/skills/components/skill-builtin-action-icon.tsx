import {
  BellAlert,
  Clock,
  MinusCircle,
  PencilSquare,
  Tag,
  Users,
} from "@medusajs/icons";
import type { SkillSystemAction } from "@repo/agent-blueprint";
import type { FC } from "react";

const ICON: Record<SkillSystemAction, typeof Users> = {
  "system:handoff": Users,
  "system:notify_team": BellAlert,
  "system:add_tag": Tag,
  "system:remove_tag": MinusCircle,
  "system:schedule_followup": Clock,
  "system:save_customer_field": PencilSquare,
};

// The icon for a built-in action in the tool picker.
export const SkillBuiltinActionIcon: FC<{ action: SkillSystemAction }> = ({
  action,
}) => {
  const Icon = ICON[action];
  return <Icon className="text-ui-fg-subtle" />;
};

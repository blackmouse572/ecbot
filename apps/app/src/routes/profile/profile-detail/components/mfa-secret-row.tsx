import { Copy, Text } from "@medusajs/ui";
import type { FC } from "react";

type MfaSecretRowProps = {
  label: string;
  value: string;
};

export const MfaSecretRow: FC<MfaSecretRowProps> = ({ label, value }) => (
  <div className="flex flex-col gap-y-1">
    <Text size="xsmall" weight="plus" className="text-ui-fg-muted">
      {label}
    </Text>
    <div className="bg-ui-bg-subtle flex items-center gap-x-2 rounded-md px-3 py-2">
      <code className="txt-compact-small min-w-0 flex-1 break-all font-mono">
        {value}
      </code>
      <Copy content={value} />
    </div>
  </div>
);

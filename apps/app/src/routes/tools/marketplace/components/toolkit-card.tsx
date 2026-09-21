import { Badge, Heading, Text } from "@medusajs/ui";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { ToolLogo } from "../../components/tool-logo";

export type ToolkitCardData = {
  slug: string;
  name: string;
  description?: string;
  categories?: { id: string; name: string }[];
  logo?: string;
};

interface ToolkitCardProps {
  toolkit: ToolkitCardData;
  to: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const ToolkitCard: FC<ToolkitCardProps> = ({ toolkit, to, onClick }) => {
  const { name, description, categories, logo } = toolkit;

  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex flex-col items-start gap-y-3 rounded-lg border bg-ui-bg-field p-4 text-left transition-[shadow,background] hover:shadow-sm hover:bg-ui-bg-base-hover focus:outline-none focus:ring-2 focus:ring-ui-border-interactive"
    >
      <div className="flex w-full items-center gap-x-3">
        <ToolLogo name={name} logo={logo} size="large" />
        <Heading level="h3" className="truncate flex-1">
          {name}
        </Heading>
      </div>
      {description ? (
        <Text size="small" className="text-ui-fg-subtle line-clamp-3">
          {description}
        </Text>
      ) : null}
      {categories && categories.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {categories.slice(0, 3).map((cat) => (
            <Badge key={cat.id} size="2xsmall" color="grey">
              {cat.name}
            </Badge>
          ))}
        </div>
      ) : null}
    </Link>
  );
};

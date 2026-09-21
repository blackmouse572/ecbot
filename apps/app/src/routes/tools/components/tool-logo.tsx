import { Avatar, Skeleton } from "@medusajs/ui";

type ToolLogoProps = {
  name: string;
  logo?: string;
  isLoading?: boolean;
  size?: React.ComponentProps<typeof Avatar>["size"];
  className?: string;
};

// Shows a tool/toolkit logo, falling back to name initials when there's no
// logo (HTTP tools, unresolved toolkit) or the image fails to load (Avatar
// swaps to fallback automatically on load error).
export const ToolLogo = ({
  name,
  logo,
  isLoading,
  size = "small",
  className,
}: ToolLogoProps) => {
  if (isLoading) {
    return <Skeleton className={`${AVATAR_SKELETON_SIZE[size]} rounded-md`} />;
  }

  return (
    <Avatar
      src={logo}
      fallback={name.slice(0, 2).toUpperCase()}
      size={size}
      variant="squared"
      className={className}
    />
  );
};

// Skeleton has no size prop tied to Avatar's scale, so mirror it here.
const AVATAR_SKELETON_SIZE: Record<string, string> = {
  "2xsmall": "h-5 w-5",
  xsmall: "h-6 w-6",
  small: "h-7 w-7",
  base: "h-8 w-8",
  large: "h-10 w-10",
  xlarge: "h-12 w-12",
};

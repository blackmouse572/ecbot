import { Badge } from "@medusajs/ui";

/**
 * Get the badge color variant based on input, this helper will make sure with same input, color will be the same.
 *
 * @param input - Input will be hased and get color based on the hased to make sure color is one
 */
export function getBadgeColor(
  input: string,
): React.ComponentPropsWithoutRef<typeof Badge>["color"] {
  const colors: Array<React.ComponentPropsWithoutRef<typeof Badge>["color"]> = [
    "green",
    "blue",
    "red",
    "grey",
    "orange",
    "purple",
  ];
  // Simple hash function for browser compatibility
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

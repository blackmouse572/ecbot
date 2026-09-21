type AvatarFallbackOptions = {
  letterAmount?: number;
  upperCase?: boolean;
};

export function getAvatarFallback(
  name?: string,
  options?: AvatarFallbackOptions,
) {
  if (!name || name === null) {
    return "NA";
  }

  const applyCase = options?.upperCase
    ? (letter: string) => letter.toUpperCase()
    : (letter: string) => letter.toLowerCase();

  const initials = name
    .split(" ")
    .slice(0, options?.letterAmount || 2) // keep only the first N words
    .map((word) => applyCase(word.charAt(0)))
    .join("");

  return initials || "?";
}

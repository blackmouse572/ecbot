import { Badge } from "@medusajs/ui";

type BadgeColor = "green" | "orange" | "grey" | "red" | "blue" | "purple";

const PALETTE: BadgeColor[] = [
  "blue",
  "green",
  "purple",
  "orange",
  "red",
  "grey",
];

// Stable per-chatbot color so the same bot reads consistently across the inbox.
const colorFor = (id: string): BadgeColor => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

export const ChatbotBadge = ({
  chatbot,
}: {
  chatbot?: { id?: string; name?: string } | null;
}) => {
  if (!chatbot?.name) return null;
  return (
    <Badge size="2xsmall" color={colorFor(chatbot.id ?? chatbot.name)}>
      {chatbot.name}
    </Badge>
  );
};

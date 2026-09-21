import { atomWithStorage } from "jotai/utils";

// Whether the customer side panel is open. Persisted so the operator's choice
// survives switching between conversation threads (issue #246). Desktop only —
// small screens default collapsed via useConversationSidebar.
export const conversationSidebarOpenAtom = atomWithStorage<boolean>(
  "conversations.customerSidebarOpen",
  true,
);

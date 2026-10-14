import { useChatbots } from "@/hooks/api/chatbot";
import { useConversations } from "@/hooks/api/conversations";
import {
  ACTIVE_CHATBOT_COUNT_QUERY,
  STATS_COUNT_QUERY,
} from "@/routes/dashboard/constants";
import { Can } from "@repo/auth";
import type { FC } from "react";
import { useLocation } from "react-router-dom";
import { OVERLAY_ROUTE } from "./constants";
import { FirstConversationCelebration } from "./first-conversation-celebration";
import { OnboardingTour } from "./onboarding-tour";
import { useGuideMoment } from "./use-guide-moment";

const countOf = (query: {
  count: number;
  isLoading: boolean;
  isError: boolean;
}) => (query.isLoading || query.isError ? undefined : query.count);

const Moments: FC = () => {
  const { pathname } = useLocation();
  const active = useChatbots(ACTIVE_CHATBOT_COUNT_QUERY);
  const conversations = useConversations(STATS_COUNT_QUERY);
  const [tour, endTour] = useGuideMoment("tour", countOf(active));
  const [celebrate, endCelebrate] = useGuideMoment(
    "firstConversation",
    countOf(conversations),
  );

  // Wait for the builder or a form opened over the page to close.
  if (OVERLAY_ROUTE.test(pathname)) return null;
  if (celebrate) return <FirstConversationCelebration onClose={endCelebrate} />;
  if (tour) return <OnboardingTour onClose={endTour} />;
  return null;
};

/** First-run moments for whoever sets up agents: the tour after the first
 * agent goes live and the note when the first conversation arrives. */
export const GuideMoments: FC = () => (
  <Can I="manage" a="CHATBOT">
    <Moments />
  </Can>
);

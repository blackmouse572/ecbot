import type { GoalId } from "./libraries";
import type { AgentProfile } from "./profile";

const MAX_REPLIES = 3;

// What a customer (or, for a personal agent, its owner) would say to start
// on each goal. Goals the agent pursues on its own, like collecting leads,
// have no reply.
const REPLIES: Partial<Record<GoalId, { vi: string; en: string }>> = {
  book_appointments: {
    vi: "Mình muốn đặt lịch",
    en: "I'd like to book an appointment",
  },
  reservations: {
    vi: "Mình muốn đặt chỗ",
    en: "I'd like to make a reservation",
  },
  take_orders: { vi: "Mình muốn đặt hàng", en: "I'd like to place an order" },
  recommend: { vi: "Tư vấn giúp mình với", en: "Can you recommend something?" },
  answer_questions: {
    vi: "Cho mình xem bảng giá",
    en: "Can I see your prices?",
  },
  promotions: {
    vi: "Đang có khuyến mãi gì không?",
    en: "Any promotions right now?",
  },
  order_status: {
    vi: "Kiểm tra đơn hàng giúp mình",
    en: "Can you check my order?",
  },
  after_sales: {
    vi: "Mình cần đổi trả hàng",
    en: "I need to return or exchange an item",
  },
  manage_schedule: {
    vi: "Hôm nay mình có lịch gì?",
    en: "What's on my calendar today?",
  },
  triage_email: {
    vi: "Có email nào quan trọng không?",
    en: "Any important emails?",
  },
  track_tasks: { vi: "Nhắc việc giúp mình", en: "Remind me of a task" },
  research: {
    vi: "Tìm hiểu giúp mình một chủ đề",
    en: "Research a topic for me",
  },
  log_contacts: { vi: "Lưu một liên hệ mới", en: "Log a new contact" },
};

/**
 * Quick replies shown under the welcome message in a test chat: the agent's
 * first goals, phrased as the visitor would tap them.
 */
export function suggestedReplies(
  profile: Pick<AgentProfile, "goals"> | null | undefined,
  language: string | null | undefined,
): string[] {
  const lang = language === "vi" ? "vi" : "en";
  return (profile?.goals ?? [])
    .map((goal) => REPLIES[goal]?.[lang])
    .filter((reply): reply is string => !!reply)
    .slice(0, MAX_REPLIES);
}

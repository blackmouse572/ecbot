import type {
  AnalyticsRange,
  WorkspaceAnalytics,
} from "@/types/workspace-analytics";

// Sample numbers for reviewing the dashboard before its API exists.
// Deterministic, so screenshots stay the same. Removed when the API lands.

const RANGE_DAYS: Record<AnalyticsRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const wave = (i: number, base: number, swing: number, seed: number) =>
  Math.max(
    0,
    Math.round(base + swing * Math.sin(i * 0.9 + seed) + ((i * seed) % 3)),
  );

export function mockWorkspaceAnalytics(
  range: AnalyticsRange,
): WorkspaceAnalytics {
  const n = RANGE_DAYS[range];
  const scale = n / 30;
  const days = Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(2026, 9, 16) - (n - 1 - i) * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
  const r = (v: number) => Math.round(v * scale);

  return {
    generatedAt: "2026-10-16T15:30:00Z",
    kpis: {
      conversionRate: { current: 18.4, previous: 15.1 },
      positiveRate: { current: 62, previous: 58 },
      handoffRate: { current: 21, previous: 26 },
      tokensPerOrder: { current: 4800, previous: 5600 },
    },
    conversion: {
      daily: days.map((day, i) => ({
        day,
        newCustomers: wave(i, 14, 5, 1),
        orders: wave(i, 3, 2, 2),
      })),
      byChannel: [
        {
          platform: "FACEBOOK_PAGE",
          newCustomers: r(190),
          engaged: r(140),
          hotLeads: r(62),
          orders: r(38),
          tokensPerOrder: 4300,
        },
        {
          platform: "ZALO_PAGE",
          newCustomers: r(120),
          engaged: r(88),
          hotLeads: r(38),
          orders: r(24),
          tokensPerOrder: 5100,
        },
        {
          platform: "WEBSITE_WIDGET",
          newCustomers: r(70),
          engaged: r(48),
          hotLeads: r(20),
          orders: r(9),
          tokensPerOrder: 6200,
        },
        {
          platform: "INSTAGRAM_PAGE",
          newCustomers: r(40),
          engaged: r(25),
          hotLeads: r(12),
          orders: r(6),
          tokensPerOrder: 5600,
        },
      ],
      medianHoursToOrder: 5.5,
    },
    marketing: {
      daily: days.map((day, i) => ({
        day,
        positive: wave(i, 9, 3, 3),
        negative: wave(i, 3, 2, 4),
        complaint: wave(i, 1, 1, 5),
      })),
      byChannel: [
        {
          platform: "FACEBOOK_PAGE",
          conversations: r(260),
          positive: 64,
          negative: 14,
        },
        {
          platform: "ZALO_PAGE",
          conversations: r(170),
          positive: 68,
          negative: 9,
        },
        {
          platform: "WEBSITE_WIDGET",
          conversations: r(90),
          positive: 51,
          negative: 20,
        },
        {
          platform: "INSTAGRAM_PAGE",
          conversations: r(55),
          positive: 58,
          negative: 12,
        },
      ],
    },
    bot: {
      daily: days.map((day, i) => ({
        day,
        botResolved: wave(i, 15, 4, 6),
        handedOver: wave(i, 4, 2, 7),
      })),
      reasons: [
        {
          key: "new_order",
          tagName: "Đơn hàng mới",
          emoji: "🧾",
          count: r(34),
        },
        {
          key: "needs_staff",
          tagName: "Cần nhân viên",
          emoji: "🙋",
          count: r(27),
        },
        { key: "complaint", tagName: "Khiếu nại", emoji: "❗", count: r(12) },
        {
          key: "new_booking",
          tagName: "Lịch hẹn mới",
          emoji: "🗓️",
          count: r(9),
        },
        { key: "fallback_threshold", count: r(7) },
        { key: "keyword_trigger", count: r(5) },
      ],
      byChatbot: [
        {
          id: "c1",
          name: "Mộc Quán Bot",
          conversations: r(410),
          botResolvedRate: 81,
          handoffRate: 19,
          firstReplySeconds: 6,
          toolErrorRate: 1.2,
        },
        {
          id: "c2",
          name: "Đặt bàn Q3",
          conversations: r(165),
          botResolvedRate: 72,
          handoffRate: 28,
          firstReplySeconds: 9,
          toolErrorRate: 3.4,
        },
      ],
    },
    customers: {
      tags: [
        { id: "t1", name: "Khách mới", emoji: "✨", count: r(310) },
        { id: "t2", name: "Khách quay lại", emoji: "🔁", count: r(182) },
        { id: "t3", name: "Hài lòng", emoji: "😊", count: r(164) },
        { id: "t4", name: "Khách tiềm năng cao", emoji: "🔥", count: r(98) },
        { id: "t5", name: "Đã đặt đơn", emoji: "🛒", count: r(77) },
        { id: "t6", name: "VIP", emoji: "⭐", count: r(31) },
        { id: "t7", name: "Không hài lòng", emoji: "😟", count: r(29) },
        { id: "t8", name: "Khiếu nại", emoji: "❗", count: r(12) },
      ],
      total: r(640),
      untagged: r(96),
      daily: days.map((day, i) => ({
        day,
        newCustomers: wave(i, 14, 5, 1),
        returning: wave(i, 7, 3, 8),
      })),
      byChannel: [
        { platform: "FACEBOOK_PAGE", count: r(290) },
        { platform: "ZALO_PAGE", count: r(185) },
        { platform: "WEBSITE_WIDGET", count: r(105) },
        { platform: "INSTAGRAM_PAGE", count: r(60) },
      ],
    },
    usage: { used: r(372_000), limit: 1_000_000 },
    unhappy: [
      {
        customerId: "u1",
        conversationId: "v1",
        name: "Trần Minh Khoa",
        platform: "ZALO_PAGE",
        tagName: "Khiếu nại",
        emoji: "❗",
        at: "2026-10-16T14:52:00Z",
      },
      {
        customerId: "u2",
        conversationId: "v2",
        name: "Lê Thu Hà",
        platform: "FACEBOOK_PAGE",
        tagName: "Không hài lòng",
        emoji: "😟",
        at: "2026-10-16T11:10:00Z",
      },
      {
        customerId: "u3",
        conversationId: "v3",
        name: "Phạm Hoàng Anh",
        platform: "WEBSITE_WIDGET",
        tagName: "Bực tức",
        emoji: "🚨",
        at: "2026-10-15T20:31:00Z",
      },
      {
        customerId: "u4",
        conversationId: "v4",
        name: "Nguyễn Thị Lan",
        platform: "INSTAGRAM_PAGE",
        tagName: "Không hài lòng",
        emoji: "😟",
        at: "2026-10-15T09:05:00Z",
      },
    ],
  };
}

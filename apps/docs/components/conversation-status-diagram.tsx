const LABELS = {
  en: {
    title: "How a conversation's status changes",
    botActive: "Bot active",
    botActiveHint: "the agent replies",
    staffTurn: "Staff's turn, bot off",
    needsYou: "Needs you",
    youHandling: "You're handling",
    resolved: "Resolved",
    resolvedHint: "the agent replies again",
    toStaff: "Agent hands over, or Pause bot",
    toBot: "Switch the bot on",
    resolve: "Resolve",
    reopen: ["Customer writes again,", "or Restore to auto"],
    footer:
      "A new request that needs staff hands over again, even after Resolved.",
  },
  vi: {
    title: "Trạng thái cuộc trò chuyện thay đổi thế nào",
    botActive: "Bot đang trả lời",
    botActiveHint: "agent trả lời khách",
    staffTurn: "Nhân viên xử lý, bot tắt",
    needsYou: "Cần bạn xử lý",
    youHandling: "Bạn đang xử lý",
    resolved: "Đã xử lý",
    resolvedHint: "agent trả lời lại",
    toStaff: "Agent chuyển, hoặc Tạm dừng bot",
    toBot: "Bật bot lại",
    resolve: "Đã xử lý",
    reopen: ["Khách nhắn tin mới,", "hoặc Khôi phục tự động"],
    footer:
      "Yêu cầu mới cần nhân viên vẫn được chuyển lại, kể cả sau khi Đã xử lý.",
  },
} as const;

const text = "fill-fd-foreground text-[14px] font-medium";
const hint = "fill-fd-muted-foreground text-[12px]";
const arrow = "stroke-fd-muted-foreground";

/** The conversation status flow, drawn inline so it follows the docs light/dark theme. */
export function ConversationStatusDiagram({
  lang,
}: {
  lang: keyof typeof LABELS;
}) {
  const l = LABELS[lang];
  return (
    <figure className="not-prose my-6">
      <svg
        viewBox="0 0 720 400"
        role="img"
        aria-label={l.title}
        className="h-auto w-full"
      >
        <title>{l.title}</title>
        <defs>
          <marker
            id="status-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L10,5 L0,10 z" className="fill-fd-muted-foreground" />
          </marker>
        </defs>

        <g>
          <rect
            x="20"
            y="40"
            width="200"
            height="80"
            rx="10"
            className="fill-green-500/15 stroke-green-600"
          />
          <text x="120" y="74" textAnchor="middle" className={text}>
            {l.botActive}
          </text>
          <text x="120" y="96" textAnchor="middle" className={hint}>
            {l.botActiveHint}
          </text>
        </g>

        <g>
          <rect
            x="480"
            y="20"
            width="220"
            height="130"
            rx="10"
            className="fill-fd-muted stroke-fd-border"
          />
          <text x="590" y="46" textAnchor="middle" className={hint}>
            {l.staffTurn}
          </text>
          <rect
            x="500"
            y="60"
            width="180"
            height="32"
            rx="8"
            className="fill-amber-500/15 stroke-amber-600"
          />
          <text x="590" y="81" textAnchor="middle" className={text}>
            {l.needsYou}
          </text>
          <rect
            x="500"
            y="102"
            width="180"
            height="32"
            rx="8"
            className="fill-blue-500/15 stroke-blue-600"
          />
          <text x="590" y="123" textAnchor="middle" className={text}>
            {l.youHandling}
          </text>
        </g>

        <g>
          <rect
            x="260"
            y="270"
            width="200"
            height="80"
            rx="10"
            className="fill-zinc-500/15 stroke-zinc-500"
          />
          <text x="360" y="304" textAnchor="middle" className={text}>
            {l.resolved}
          </text>
          <text x="360" y="326" textAnchor="middle" className={hint}>
            {l.resolvedHint}
          </text>
        </g>

        <path
          d="M220,60 L480,60"
          fill="none"
          markerEnd="url(#status-arrow)"
          className={arrow}
        />
        <text x="350" y="48" textAnchor="middle" className={hint}>
          {l.toStaff}
        </text>
        <path
          d="M480,108 L220,108"
          fill="none"
          markerEnd="url(#status-arrow)"
          className={arrow}
        />
        <text x="350" y="128" textAnchor="middle" className={hint}>
          {l.toBot}
        </text>

        <path
          d="M570,150 L440,270"
          fill="none"
          markerEnd="url(#status-arrow)"
          className={arrow}
        />
        <text x="520" y="222" className={hint}>
          {l.resolve}
        </text>

        <path
          d="M260,300 L100,120"
          fill="none"
          markerEnd="url(#status-arrow)"
          className={arrow}
        />
        <text x="20" y="236" className={hint}>
          {l.reopen[0]}
        </text>
        <text x="20" y="252" className={hint}>
          {l.reopen[1]}
        </text>

        <text x="360" y="388" textAnchor="middle" className={hint}>
          {l.footer}
        </text>
      </svg>
    </figure>
  );
}

const LABELS = {
  en: {
    title: "How a customer moves through the stages",
    stages: [
      ["New", ["first", "message"]],
      ["Interested", ["asks about", "a product"]],
      ["Asked price", ["asks", "the price"]],
      ["Bought once", ["first order", "confirmed"]],
      ["Repeat buyer", ["second order", "confirmed"]],
    ],
    inactive: "Inactive",
    inactiveHint: "no message and no order for 120 days, at any stage",
    footer:
      "The bot only moves a customer forward. Your staff can pick any stage.",
  },
  vi: {
    title: "Khách đi qua các giai đoạn thế nào",
    stages: [
      ["Mới biết", ["nhắn shop", "lần đầu"]],
      ["Quan tâm", ["hỏi về", "sản phẩm"]],
      ["Hỏi giá", ["hỏi giá", "sản phẩm"]],
      ["Đã mua 1 lần", ["đơn đầu", "được xác nhận"]],
      ["Mua lại", ["đơn thứ hai", "được xác nhận"]],
    ],
    inactive: "Lâu không nhắn",
    inactiveHint:
      "120 ngày không nhắn và không đặt đơn, ở bất kỳ giai đoạn nào",
    footer:
      "Bot chỉ đưa khách lên giai đoạn sau. Nhân viên chọn được mọi giai đoạn.",
  },
} as const;

// The stage colours of the app's stage tags.
const TONES = [
  "fill-blue-500/15 stroke-blue-600",
  "fill-purple-500/15 stroke-purple-600",
  "fill-orange-500/15 stroke-orange-600",
  "fill-green-500/15 stroke-green-600",
  "fill-green-500/25 stroke-green-700",
];

const text = "fill-fd-foreground text-[14px] font-medium";
const hint = "fill-fd-muted-foreground text-[12px]";
const W = 124;
const GAP = 25;

/** The five journey stages and Inactive, drawn inline so it follows the docs theme. */
export function StageJourneyDiagram({ lang }: { lang: keyof typeof LABELS }) {
  const l = LABELS[lang];
  return (
    <figure className="not-prose my-6">
      <svg
        viewBox="0 0 720 230"
        role="img"
        aria-label={l.title}
        className="h-auto w-full"
      >
        <title>{l.title}</title>
        <defs>
          <marker
            id="stage-arrow"
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
        {l.stages.map(([name, how], i) => {
          const x = i * (W + GAP);
          return (
            <g key={name}>
              <rect
                x={x + 1}
                y="30"
                width={W - 2}
                height="64"
                rx="10"
                className={TONES[i]}
              />
              <text x={x + W / 2} y="67" textAnchor="middle" className={text}>
                {name}
              </text>
              {how.map((line, j) => (
                <text
                  key={line}
                  x={x + W / 2}
                  y={116 + j * 16}
                  textAnchor="middle"
                  className={hint}
                >
                  {line}
                </text>
              ))}
              {i < l.stages.length - 1 && (
                <path
                  d={`M${x + W + 1},62 L${x + W + GAP - 2},62`}
                  fill="none"
                  markerEnd="url(#stage-arrow)"
                  className="stroke-fd-muted-foreground"
                />
              )}
            </g>
          );
        })}
        <path
          d="M20,152 L700,152"
          fill="none"
          strokeDasharray="4 4"
          className="stroke-fd-border"
        />
        <rect
          x="210"
          y="170"
          width="300"
          height="44"
          rx="10"
          strokeDasharray="5 4"
          className="fill-zinc-500/15 stroke-zinc-500"
        />
        <text x="360" y="197" textAnchor="middle" className={text}>
          {l.inactive}
        </text>
      </svg>
      <figcaption className="text-fd-muted-foreground mt-2 text-center text-sm">
        {l.inactive}: {l.inactiveHint}. {l.footer}
      </figcaption>
    </figure>
  );
}

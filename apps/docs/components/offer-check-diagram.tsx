const LABELS = {
  en: {
    title: "Who counts in To do this week",
    checks: [
      ["Offers", ["not Stopped", "for good"]],
      ["Not paused", ["offers not", "Paused"]],
      ["Not upset", ["Upset is", "off"]],
    ],
    yes: "Counted",
    yesHint: ["worth a", "message"],
    no: "Any check fails: Ecbot leaves the customer out and counts them in “left out”.",
  },
  vi: {
    title: "Ai được tính vào Việc nên làm tuần này",
    checks: [
      ["Nhận ưu đãi", ["chưa dừng", "vĩnh viễn"]],
      ["Không tạm ngưng", ["nhận ưu đãi không", "Tạm ngưng"]],
      ["Không khó chịu", ["Khó chịu", "đang tắt"]],
    ],
    yes: "Được tính",
    yesHint: ["nên nhắn", "tuần này"],
    no: "Chỉ cần một điều kiện không đạt, Ecbot bỏ khách ra và tính vào số “đã bỏ”.",
  },
} as const;

const text = "fill-fd-foreground text-[14px] font-medium";
const hint = "fill-fd-muted-foreground text-[12px]";
const W = 150;
const GAP = 40;

/** The checks a customer passes before the Marketing overview counts them, drawn inline. */
export function OfferCheckDiagram({ lang }: { lang: keyof typeof LABELS }) {
  const l = LABELS[lang];
  const boxes = [...l.checks, [l.yes, l.yesHint] as const];
  return (
    <figure className="not-prose my-6">
      <svg
        viewBox="0 0 720 160"
        role="img"
        aria-label={l.title}
        className="h-auto w-full"
      >
        <title>{l.title}</title>
        <defs>
          <marker
            id="check-arrow"
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
        {boxes.map(([name, lines], i) => {
          const x = i * (W + GAP);
          const last = i === boxes.length - 1;
          return (
            <g key={name}>
              <rect
                x={x + 1}
                y="20"
                width={W - 2}
                height="104"
                rx="10"
                className={
                  last
                    ? "fill-green-500/15 stroke-green-600"
                    : "fill-fd-muted stroke-fd-border"
                }
              />
              <text x={x + W / 2} y="50" textAnchor="middle" className={text}>
                {name}
              </text>
              {lines.map((line, j) => (
                <text
                  key={line}
                  x={x + W / 2}
                  y={82 + j * 16}
                  textAnchor="middle"
                  className={hint}
                >
                  {line}
                </text>
              ))}
              {!last && (
                <path
                  d={`M${x + W + 1},72 L${x + W + GAP - 2},72`}
                  fill="none"
                  markerEnd="url(#check-arrow)"
                  className="stroke-fd-muted-foreground"
                />
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="text-fd-muted-foreground mt-2 text-center text-sm">
        {l.no}
      </figcaption>
    </figure>
  );
}

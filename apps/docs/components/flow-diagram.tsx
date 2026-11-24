type Step = { name: string; hint: string[]; tone?: "muted" | "accent" };

const text = "fill-fd-foreground text-[14px] font-medium";
const hint = "fill-fd-muted-foreground text-[12px]";
const W = 124;
const H = 112;

/**
 * A row of labelled boxes drawn inline from MDX props, joined by arrows
 * (`arrows`) or set side by side as separate things. The page writes the
 * words in its own language.
 */
export function FlowDiagram({
  title,
  steps,
  caption,
  arrows = false,
}: {
  title: string;
  steps: Step[];
  caption?: string;
  arrows?: boolean;
}) {
  const gap = arrows ? 25 : 16;
  const width = steps.length * W + (steps.length - 1) * gap;
  return (
    <figure className="not-prose my-6">
      <svg
        viewBox={`0 0 ${width} ${H + 8}`}
        role="img"
        aria-label={title}
        className="mx-auto h-auto w-full"
        style={{ maxWidth: width * 1.15 }}
      >
        <title>{title}</title>
        <defs>
          <marker
            id="flow-arrow"
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
        {steps.map((step, i) => {
          const x = i * (W + gap);
          return (
            <g key={step.name}>
              <rect
                x={x + 1}
                y="4"
                width={W - 2}
                height={H}
                rx="10"
                className={
                  step.tone === "accent"
                    ? "fill-green-500/15 stroke-green-600"
                    : "fill-fd-muted stroke-fd-border"
                }
              />
              {arrows && (
                <text x={x + 14} y="28" className={hint}>
                  {i + 1}
                </text>
              )}
              <text x={x + W / 2} y="48" textAnchor="middle" className={text}>
                {step.name}
              </text>
              {step.hint.map((line, j) => (
                <text
                  key={line}
                  x={x + W / 2}
                  y={74 + j * 16}
                  textAnchor="middle"
                  className={hint}
                >
                  {line}
                </text>
              ))}
              {arrows && i < steps.length - 1 && (
                <path
                  d={`M${x + W + 1},60 L${x + W + gap - 2},60`}
                  fill="none"
                  markerEnd="url(#flow-arrow)"
                  className="stroke-fd-muted-foreground"
                />
              )}
            </g>
          );
        })}
      </svg>
      {caption && (
        <figcaption className="text-fd-muted-foreground mt-2 text-center text-sm">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

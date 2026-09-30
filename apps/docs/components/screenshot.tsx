import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import shots from "@/generated/screenshots.json";

type Box = { x: number; y: number; w: number; h: number };
type Shot = { src: string; width: number; height: number; marks: Record<string, Box> };
const data = shots as Record<string, Record<string, Shot>>;

type MarkProps = { id: string; children: ReactNode };

/** One numbered callout on a <Screenshot>. The parent renders it. */
export function Mark(_: MarkProps): null {
  return null;
}

/**
 * An app screenshot from `pnpm --filter docs shots`, captured in the page's
 * language, with numbered boxes drawn over it and a legend below. Positions
 * come from screenshots.config.mjs; the text and order come from the <Mark>
 * children, so the explanation lives in the MDX:
 *
 *   <Screenshot name="kb-list" alt="The knowledge base list">
 *     <Mark id="create">Add a file, a web page or a note.</Mark>
 *   </Screenshot>
 *
 * An unknown screenshot or mark throws, which fails the build instead of
 * shipping callouts that point at nothing.
 */
export function Screenshot({
  lang,
  name,
  alt,
  children,
}: {
  lang: string;
  name: string;
  alt: string;
  children?: ReactNode;
}) {
  const shot = data[name]?.[lang];
  if (!shot)
    throw new Error(
      `<Screenshot name="${name}">: no ${lang} capture. Add it to screenshots.config.mjs and run \`pnpm --filter docs shots\`.`,
    );

  const marks = Children.toArray(children)
    .filter((child): child is ReactElement<MarkProps> => isValidElement(child) && child.type === Mark)
    .map((child, i) => {
      const box = shot.marks[child.props.id];
      if (!box)
        throw new Error(
          `<Screenshot name="${name}">: no mark "${child.props.id}". Known: ${Object.keys(shot.marks).join(", ")}.`,
        );
      return { n: i + 1, id: child.props.id, box, label: child.props.children };
    });

  return (
    <figure className="not-prose my-6">
      <div className="relative">
        <img
          src={shot.src}
          alt={alt}
          width={shot.width}
          height={shot.height}
          loading="lazy"
          className="block h-auto w-full rounded-xl border bg-fd-card shadow-sm"
        />
        {marks.map(({ n, box }) => (
          <div key={n} aria-hidden className="pointer-events-none">
            <div
              className="absolute rounded-md bg-blue-500/5 ring-2 ring-blue-500"
              style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
            />
            <span
              className="absolute grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-blue-500 text-xs font-semibold text-white shadow-md ring-2 ring-white"
              style={{ left: `max(0.75rem, ${box.x}%)`, top: `max(0.75rem, ${box.y}%)` }}
            >
              {n}
            </span>
          </div>
        ))}
      </div>
      {marks.length > 0 && (
        <ol className="mt-4 space-y-2 text-sm text-fd-foreground">
          {marks.map(({ n, id, label }) => (
            <li key={id} className="flex gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-500 text-[0.7rem] font-semibold text-white">
                {n}
              </span>
              <span className="[&_p]:m-0">{label}</span>
            </li>
          ))}
        </ol>
      )}
      <figcaption className="sr-only">{alt}</figcaption>
    </figure>
  );
}

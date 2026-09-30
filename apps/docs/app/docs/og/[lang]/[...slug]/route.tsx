import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { source } from "@/lib/source";

export const revalidate = false;

type Ctx = { params: Promise<{ lang: string; slug: string[] }> };

// Colors mirror the marketing site's tokens (ink zinc-900, muted zinc-500,
// accent blue-400). Satori needs a static TTF with Vietnamese glyphs.
export async function GET(_req: Request, { params }: Ctx) {
  const { lang, slug } = await params;
  const page = source.getPage(slug.slice(0, -1), lang);
  if (!page) notFound();

  const font = await readFile(
    path.join(process.cwd(), "assets/og/WixMadeforDisplay-Medium.ttf"),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#fff",
          borderTop: "12px solid #60a5fa",
          fontFamily: "Wix",
        }}
      >
        <div style={{ fontSize: 32, color: "#71717a" }}>Ecbot Docs</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, color: "#18181b", lineHeight: 1.1 }}>
            {page.data.title}
          </div>
          <div style={{ fontSize: 32, color: "#71717a", lineHeight: 1.35 }}>
            {page.data.description}
          </div>
        </div>
        <div style={{ fontSize: 28, color: "#71717a" }}>{`ecbot.dev/${lang}/docs`}</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [{ name: "Wix", data: font, weight: 500, style: "normal" }],
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: [...page.slugs, "image.png"],
  }));
}

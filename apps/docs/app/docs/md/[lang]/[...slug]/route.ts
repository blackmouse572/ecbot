import { notFound } from "next/navigation";
import { docsLlms, source } from "@/lib/source";
import { markdownSegments, slugsFromMarkdownSegments } from "@/lib/urls";

export const revalidate = false;

type Ctx = { params: Promise<{ lang: string; slug: string[] }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { lang, slug } = await params;
  const page = source.getPage(slugsFromMarkdownSegments(slug), lang);
  if (!page) notFound();
  return new Response(await docsLlms.page(page), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: markdownSegments(page.slugs),
  }));
}

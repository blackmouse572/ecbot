import { docsLlms, indexedPages } from "@/lib/source";
import { i18n } from "@/lib/i18n";

export const revalidate = false;

export async function GET() {
  const parts = await Promise.all(
    i18n.languages.flatMap((lang) => indexedPages(lang).map((page) => docsLlms.page(page))),
  );
  return new Response(parts.join("\n\n"));
}

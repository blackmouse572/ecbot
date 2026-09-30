import { docsLlms } from "@/lib/source";
import { i18n } from "@/lib/i18n";
import { absoluteLinks } from "@/lib/markdown";
import { SITE_URL } from "@/lib/urls";

export const revalidate = false;

const SECTION: Record<string, string> = { en: "English", vi: "Tiếng Việt" };

// llmstxt.org shape: title, one-line summary, then a link list per language.
export async function GET() {
  const sections = await Promise.all(
    i18n.languages.map(
      async (lang) => {
        // index() starts with the tree's own "# title" line; the file has one title.
        const list = (await docsLlms.index(lang)).replace(/^# .*\n+/, "");
        return `## Docs (${SECTION[lang]})\n\n${absoluteLinks(list)}`;
      },
    ),
  );
  const body = `# Ecbot Docs

> Ecbot is one AI agent that answers customers on Facebook Messenger, Zalo, Telegram, WhatsApp and your website. These docs show shop owners how to set it up.

Full text of every page: ${SITE_URL}/docs/llms-full.txt

${sections.join("\n\n")}
`;
  return new Response(body);
}

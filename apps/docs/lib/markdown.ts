/* Helpers for the Markdown copies served to answer engines (llms.txt, .md).
 * MDX components mean nothing outside the site, so screenshots become a
 * plain image plus the numbered callouts a reader would see. */
import { SITE_URL } from "./urls";

const SCREENSHOT = /<Screenshot\s+name="([^"]+)"\s+alt="([^"]*)"\s*>([\s\S]*?)<\/Screenshot>/g;
const MARK = /<Mark id="[^"]+">([\s\S]*?)<\/Mark>/g;

export function screenshotsToMarkdown(md: string, lang: string) {
  return md.replace(SCREENSHOT, (_, name: string, alt: string, body: string) => {
    const marks = [...body.matchAll(MARK)].map(
      ([, text], i) => `${i + 1}. ${text!.replace(/\s+/g, " ").replace(/\s([.,:;)])/g, "$1").replace(/\(\s/g, "(").trim()}`,
    );
    const image = `![${alt}](${SITE_URL}/_docs/screenshots/${lang}/${name}.png)`;
    return marks.length ? `${image}\n\n${marks.join("\n")}` : image;
  });
}

export function absoluteLinks(md: string) {
  return md.replace(/\]\(\//g, `](${SITE_URL}/`);
}

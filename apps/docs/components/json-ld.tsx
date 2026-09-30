/* Server component: the script is in the static HTML, so crawlers and answer
 * engines read it without running JS. */
import { serializeJsonLd } from "@/lib/seo";

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

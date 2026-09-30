import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import type { FaqItem } from "@/lib/seo";

export function Faq({ items, title }: { items: FaqItem[]; title: string }) {
  if (!items.length) return null;
  return (
    <section>
      <h2 id="faq">{title}</h2>
      <Accordions>
        {items.map((item) => (
          <Accordion key={item.q} title={item.q}>
            <p>{item.a}</p>
          </Accordion>
        ))}
      </Accordions>
    </section>
  );
}

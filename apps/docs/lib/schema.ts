import { z } from "zod";

/** Page FAQs render after the body and feed the FAQPage JSON-LD. */
export const faqSchema = z.array(z.object({ q: z.string(), a: z.string() }));

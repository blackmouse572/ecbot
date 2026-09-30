import { createFromSource } from "fumadocs-core/search/server";
import { source } from "@/lib/source";

export const revalidate = false;

// Exported at build time; the browser downloads it once and searches locally.
export const { staticGET: GET } = createFromSource(source);

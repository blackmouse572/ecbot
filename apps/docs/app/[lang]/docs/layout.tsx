import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { sectionsToFolders } from "@/lib/sidebar";
import { source } from "@/lib/source";

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
  return (
    <DocsLayout
      tree={sectionsToFolders(source.getPageTree(lang), 2)}
      {...baseOptions(lang)}
    >
      {children}
    </DocsLayout>
  );
}

import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import type { ReactNode } from "react";
import { baseOptions } from "@/lib/layout.shared";
import { sectionsToFolders, splitTabs, tabsOf } from "@/lib/sidebar";
import { source } from "@/lib/source";

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
  const tree = splitTabs(sectionsToFolders(source.getPageTree(lang), 2), {
    agent: "Agent",
    marketing: lang === "vi" ? "Tiếp thị" : "Marketing",
  });
  const base = baseOptions(lang);
  return (
    <DocsLayout
      tree={tree}
      tabs={tabsOf(tree)}
      tabMode="navbar"
      {...base}
      nav={{ ...base.nav, mode: "top" }}
    >
      {children}
    </DocsLayout>
  );
}

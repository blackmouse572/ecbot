import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import Link from "fumadocs-core/link";
import type { Metadata } from "next";
import type { ComponentProps } from "react";
import { notFound } from "next/navigation";
import { Faq } from "@/components/faq";
import { JsonLd } from "@/components/json-ld";
import { getMDXComponents } from "@/components/mdx";
import { Mark, Screenshot } from "@/components/screenshot";
import {
  alternateLanguages,
  breadcrumbNode,
  faqNode,
  graph,
  ogLocale,
  techArticleNode,
  TITLE_SUFFIX,
} from "@/lib/seo";
import { type DocsPage as Page, pageLocales, source } from "@/lib/source";
import { markdownPath, ogImagePath, pageUrl, repoUrl, SITE_URL } from "@/lib/urls";

type Props = { params: Promise<{ lang: string; slug?: string[] }> };

async function getPage(props: Props) {
  const { lang, slug = [] } = await props.params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();
  return { lang, slug, page };
}

/** Docs home, then every ancestor page that exists, then this page. */
function trail(lang: string, page: Page) {
  const crumbs = [];
  for (let i = 0; i < page.slugs.length; i++) {
    const ancestor = source.getPage(page.slugs.slice(0, i), lang);
    if (ancestor) crumbs.push({ name: ancestor.data.title, url: pageUrl(lang, ancestor.slugs) });
  }
  crumbs.push({ name: page.data.title, url: pageUrl(lang, page.slugs) });
  return crumbs;
}

export default async function DocPage(props: Props) {
  const { lang, page } = await getPage(props);
  const MDX = page.data.body;
  const url = pageUrl(lang, page.slugs);
  const markdownUrl = markdownPath(page);

  const jsonLd = graph([
    techArticleNode({
      url,
      lang,
      title: page.data.title,
      description: page.data.description,
      image: `${SITE_URL}${ogImagePath(page)}`,
      modified: page.data.lastModified,
    }),
    breadcrumbNode(url, trail(lang, page)),
    ...(page.data.faq.length ? [faqNode(url, page.data.faq)] : []),
  ]);

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full}
      tableOfContent={{ style: "clerk" }}
    >
      <JsonLd data={jsonLd} />
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row items-center gap-2 border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`${repoUrl}/blob/main/apps/docs/content/docs/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX
          components={getMDXComponents({
            // Content links to "/docs/x"; keep the reader in their language.
            a: ({ href = "", ...rest }) => (
              <Link href={href.startsWith("/docs") ? `/${lang}${href}` : href} {...rest} />
            ),
            Screenshot: (props: Omit<ComponentProps<typeof Screenshot>, "lang">) => (
              <Screenshot lang={lang} {...props} />
            ),
            Mark,
          })}
        />
        <Faq
          items={page.data.faq}
          title={lang === "vi" ? "Câu hỏi thường gặp" : "Frequently asked questions"}
        />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams("slug", "lang");
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { lang, page } = await getPage(props);
  const url = pageUrl(lang, page.slugs);
  const title = `${page.data.title}${TITLE_SUFFIX}`;
  const description = page.data.description;
  const image = { url: ogImagePath(page), width: 1200, height: 630, alt: page.data.title };
  const locales = pageLocales(page.slugs);

  return {
    title,
    description,
    ...(page.data.noindex ? { robots: { index: false, follow: false } } : {}),
    alternates: {
      canonical: url,
      languages: alternateLanguages(page.slugs, locales),
      types: { "text/markdown": markdownPath(page) },
    },
    openGraph: {
      type: "article",
      url,
      siteName: "Ecbot Docs",
      title,
      description,
      locale: ogLocale(lang),
      alternateLocale: locales.filter((l) => l !== lang).map(ogLocale),
      modifiedTime: page.data.lastModified?.toISOString(),
      images: [image],
    },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
  };
}

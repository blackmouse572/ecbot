import type { Metadata } from "next";
import { Geist_Mono, Inter, Wix_Madefor_Display } from "next/font/google";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { i18nProvider } from "fumadocs-ui/i18n";
import { Provider } from "@/components/provider";
import { i18n } from "@/lib/i18n";
import { translations } from "@/lib/layout.shared";
import { SITE_URL } from "@/lib/urls";
import "../global.css";

const display = Wix_Madefor_Display({
  subsets: ["vietnamese", "latin-ext"],
  weight: ["500", "700"],
  variable: "--font-wix",
  display: "swap",
});
// Inter carries the Vietnamese glyphs (Geist does not).
const body = Inter({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-inter",
  display: "swap",
});
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const favicon = "/_docs/favicon";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  icons: {
    icon: [
      { url: `${favicon}/favicon.svg`, type: "image/svg+xml" },
      { url: `${favicon}/favicon-96x96.png`, sizes: "96x96", type: "image/png" },
    ],
    shortcut: `${favicon}/favicon.ico`,
    apple: `${favicon}/apple-touch-icon.png`,
  },
  robots: { index: true, follow: true },
};

export function generateStaticParams() {
  return i18n.languages.map((lang) => ({ lang }));
}

export default async function LangLayout({
  params,
  children,
}: {
  params: Promise<{ lang: string }>;
  children: ReactNode;
}) {
  const { lang } = await params;
  if (!i18n.languages.includes(lang as never)) notFound();

  return (
    <html
      lang={lang}
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-sans">
        <Provider i18n={i18nProvider(translations, lang)}>{children}</Provider>
      </body>
    </html>
  );
}

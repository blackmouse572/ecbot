import { Toaster, TooltipProvider } from "@medusajs/ui";
import { NuqsAdapter } from "nuqs/adapters/react-router/v6";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import type { PropsWithChildren } from "react";
import { CookiesProvider } from "react-cookie";
import { HelmetProvider } from "react-helmet-async";
import { I18nextProvider } from "react-i18next";
import queryClient from "../libs/query-client";
import { ThemeProvider } from "./theme-provider";

import i18n from "@/i18n";
import React from "react";
import { createPortal } from "react-dom";
import { ClientProvider } from "./client-provider";

type ProvidersProps = PropsWithChildren<object>;
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import("@tanstack/react-query-devtools/build/modern/production.js").then(
    (d) => ({
      default: d.ReactQueryDevtools,
    }),
  ),
);

/** Portal helper for content that must escape the app tree (devtools, overlays). */
const renderInBody = (node: React.ReactNode) =>
  createPortal(node, document.body);

export const Providers = ({ children }: ProvidersProps) => {
  const [showDevtools, setShowDevtools] = React.useState(false);

  React.useEffect(() => {
    // @ts-expect-error Devtools
    window.toggleDevtools = () => setShowDevtools((old) => !old);
  }, []);

  const productionDevtools = (
    <React.Suspense fallback={null}>
      <ReactQueryDevtoolsProduction />
    </React.Suspense>
  );

  return (
    <NuqsAdapter>
      <CookiesProvider>
        <QueryClientProvider client={queryClient}>
          {renderInBody(<ReactQueryDevtools />)}
          {showDevtools && renderInBody(productionDevtools)}
          <I18nextProvider i18n={i18n} defaultNS={"translation"}>
            <TooltipProvider>
              <HelmetProvider>
                <ThemeProvider>
                  <ClientProvider>{children}</ClientProvider>
                  <Toaster />
                </ThemeProvider>
              </HelmetProvider>
            </TooltipProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </CookiesProvider>
    </NuqsAdapter>
  );
};

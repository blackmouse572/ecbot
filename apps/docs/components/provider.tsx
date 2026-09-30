"use client";
import { RootProvider } from "fumadocs-ui/provider/next";
import type { ComponentProps } from "react";
import SearchDialog from "@/components/search";

export function Provider(props: Omit<ComponentProps<typeof RootProvider>, "search">) {
  return <RootProvider search={{ SearchDialog }} {...props} />;
}

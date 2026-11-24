import type { Root } from "fumadocs-core/page-tree";
import { describe, expect, it } from "vitest";
import { sectionsToFolders } from "../lib/sidebar";

const page = (name: string) => ({
  type: "page" as const,
  name,
  url: `/${name}`,
});
const sep = (name: string) => ({ type: "separator" as const, name });

describe("sectionsToFolders", () => {
  const tree: Root = {
    name: "Docs",
    children: [
      sep("Start here"),
      page("a"),
      page("b"),
      sep("Build"),
      page("c"),
      sep("Developers"),
      page("d"),
    ],
  };

  it("turns each separator and the pages after it into a collapsible folder", () => {
    const out = sectionsToFolders(tree, 1);
    expect(out.children.map((n) => [n.type, n.name])).toEqual([
      ["folder", "Start here"],
      ["folder", "Build"],
      ["folder", "Developers"],
    ]);
    expect(out.children[0]).toMatchObject({ children: [page("a"), page("b")] });
  });

  it("opens only the first sections by default", () => {
    const open = sectionsToFolders(tree, 2).children.map(
      (n) => n.type === "folder" && n.defaultOpen,
    );
    expect(open).toEqual([true, true, false]);
  });

  it("keeps pages that come before any separator at the top level", () => {
    const out = sectionsToFolders(
      { name: "Docs", children: [page("x"), sep("S"), page("y")] },
      1,
    );
    expect(out.children.map((n) => n.type)).toEqual(["page", "folder"]);
  });
});

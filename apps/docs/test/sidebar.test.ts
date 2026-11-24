import type { Folder, Root } from "fumadocs-core/page-tree";
import { describe, expect, it } from "vitest";
import { sectionsToFolders, splitTabs, tabsOf } from "../lib/sidebar";

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

describe("splitTabs", () => {
  const folder = (name: string, urls: string[]) => ({
    type: "folder" as const,
    name,
    children: urls.map((url) => ({ type: "page" as const, name: url, url })),
  });
  const tree: Root = {
    name: "Docs",
    children: [
      folder("Start here", ["/en/docs", "/en/docs/getting-started/setup"]),
      folder("Grow sales", ["/en/docs/marketing", "/en/docs/marketing/stages"]),
      folder("Developers", ["/en/docs/dev/mcp"]),
    ],
  };

  it("puts marketing sections in a Marketing tab and the rest in an Agent tab", () => {
    const out = splitTabs(tree, { agent: "Agent", marketing: "Marketing" });
    expect(
      out.children.map((n) => [n.type, n.name, n.type === "folder" && n.root]),
    ).toEqual([
      ["folder", "Agent", true],
      ["folder", "Marketing", true],
    ]);
    const [agent, marketing] = out.children as Folder[];
    expect(agent!.children.map((n) => n.name)).toEqual([
      "Start here",
      "Developers",
    ]);
    expect(
      marketing!.children.map((n) => (n.type === "page" ? n.url : n.name)),
    ).toEqual(["/en/docs/marketing", "/en/docs/marketing/stages"]);
  });

  it("links each tab to its first page", () => {
    const tabs = tabsOf(
      splitTabs(tree, { agent: "Agent", marketing: "Marketing" }),
    );
    expect(tabs.map((t) => [t.title, t.url])).toEqual([
      ["Agent", "/en/docs"],
      ["Marketing", "/en/docs/marketing"],
    ]);
  });
});

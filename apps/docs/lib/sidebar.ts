import type { Folder, Node, Root } from "fumadocs-core/page-tree";

/** The root meta lists pages by path under `---Section---` separators, which
 * keeps every URL stable. Turn each separator and the pages after it into a
 * collapsible folder; the first `openCount` sections start open. */
export function sectionsToFolders(tree: Root, openCount: number): Root {
  const children: Node[] = [];
  let current: Folder | undefined;
  let sections = 0;
  for (const node of tree.children) {
    if (node.type === "separator") {
      current = {
        $id: node.$id,
        type: "folder",
        name: node.name ?? "",
        icon: node.icon,
        defaultOpen: sections++ < openCount,
        children: [],
      };
      children.push(current);
    } else if (current) current.children.push(node);
    else children.push(node);
  }
  return { ...tree, children };
}

const isMarketing = (node: Node): boolean =>
  node.type === "page"
    ? /\/docs\/marketing(\/|$)/.test(node.url)
    : node.type === "folder" &&
      node.children.length > 0 &&
      node.children.every(isMarketing);

/** Split the sections into two top tabs: Agent, and Marketing for the
 * Grow sales pages (their sections are flattened, one level is enough). */
export function splitTabs(
  tree: Root,
  names: { agent: string; marketing: string },
): Root {
  const agent: Node[] = [];
  const marketing: Node[] = [];
  for (const node of tree.children) {
    if (!isMarketing(node)) agent.push(node);
    else if (node.type === "folder") marketing.push(...node.children);
    else marketing.push(node);
  }
  const tab = (name: string, children: Node[]): Folder => ({
    $id: `tab:${name}`,
    type: "folder",
    name,
    root: true,
    children,
  });
  return {
    ...tree,
    children: [tab(names.agent, agent), tab(names.marketing, marketing)],
  };
}

const firstUrl = (nodes: Node[]): string | undefined => {
  for (const node of nodes) {
    if (node.type === "page") return node.url;
    if (node.type === "folder") {
      const url = node.index?.url ?? firstUrl(node.children);
      if (url) return url;
    }
  }
};

/** One navbar tab per root folder, linking to its first page (fumadocs only
 * looks one level down, and the Agent tab holds sections). */
export function tabsOf(tree: Root) {
  return tree.children.flatMap((node) => {
    const url =
      node.type === "folder" && node.root ? firstUrl([node]) : undefined;
    return node.type === "folder" && url
      ? [{ title: node.name, url, $folder: node }]
      : [];
  });
}

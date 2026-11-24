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

import type { SkillToolNamer } from "@repo/agent-blueprint";
import { createContext, useContext, type FC, type ReactNode } from "react";

// A tool a Tool step can call, as the picker and the step's fields need it.
export type SkillStepTool = {
  id: string;
  kind: "HTTP" | "MCP" | (string & {});
  displayName: string;
  /** MCP tools: the actions the step can pick from. */
  discoveredActions?: unknown[];
};

export type SkillToolList = {
  tools: SkillStepTool[];
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
};

// Where the steps editor gets tools and tags. The client app reads the
// workspace's; the admin has no workspace for a builtin template, so it uses
// the default: only the built-in actions, and tag names typed in.
//
// `useToolList` and `useTool` are hooks: the picker calls them on every
// render with its own search text or the step's tool id, so they can run a
// query per argument. Pass the same functions on every render.
export type SkillStepsData = {
  /** Hook: workspace tools matching `search`, loaded page by page. */
  useToolList: (search: string) => SkillToolList;
  /** Hook: one workspace tool ("" when the step has none). */
  useTool: (toolId: string) => SkillStepTool | undefined;
  /** Customer tag names; leave out to type the tag name instead. */
  tagNames?: string[];
  /** Names Tool steps when steps are turned into text (Write as text instead). */
  toolNamer?: (toolIds: string[]) => Promise<SkillToolNamer>;
};

const NO_TOOLS: SkillStepsData = {
  useToolList: () => ({ tools: [] }),
  useTool: () => undefined,
};

const SkillStepsDataContext = createContext<SkillStepsData>(NO_TOOLS);

export const SkillStepsDataProvider: FC<{
  value: SkillStepsData;
  children: ReactNode;
}> = ({ value, children }) => (
  <SkillStepsDataContext.Provider value={value}>
    {children}
  </SkillStepsDataContext.Provider>
);

export const useSkillStepsData = () => useContext(SkillStepsDataContext);

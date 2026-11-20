import type { ToolListResponseDto } from "@repo/client";

type ToolSource = { ready: boolean; host?: string };

const hostOf = (url?: string) => {
  try {
    return url ? new URL(url).hostname : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Where a tool comes from, in owner words: installed from the store
 * ("ready-made"), or set up by a developer against their own host.
 */
export const toolSource = (tool: ToolListResponseDto): ToolSource => {
  if (tool.mcpProvider === "COMPOSIO" || tool.mcpProvider === "ECCHO") {
    return { ready: true };
  }

  const host = hostOf(tool.kind === "HTTP" ? tool.httpUrl : tool.mcpServerUrl);

  return host ? { ready: false, host } : { ready: false };
};

import { ENUM_MCP_PROVIDER } from '../enums/mcp-provider.enum';
import { ENUM_TOOL_KIND } from '../enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from '../enums/tool-status.enum';

export const TOOL_DEFAULT_AVAILABLE_SEARCH: string[] = ['name', 'description'];
export const TOOL_DEFAULT_KIND_FILTER: ENUM_TOOL_KIND[] = [
    ENUM_TOOL_KIND.HTTP,
    ENUM_TOOL_KIND.MCP,
];
export const TOOL_DEFAULT_STATUS_FILTER: ENUM_TOOL_STATUS[] = [
    ENUM_TOOL_STATUS.ACTIVE,
    ENUM_TOOL_STATUS.NEEDS_REAUTH,
    ENUM_TOOL_STATUS.EXPIRED,
    ENUM_TOOL_STATUS.REVOKED,
];

export const TOOL_DEFAULT_MCP_PROVIDER_FILTER: ENUM_MCP_PROVIDER[] = [
    ENUM_MCP_PROVIDER.ECCHO,
    ENUM_MCP_PROVIDER.COMPOSIO,
];

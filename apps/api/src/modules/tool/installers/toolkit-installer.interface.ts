import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ToolInstallSessionEntity } from 'src/modules/tool/repository/entities/tool-install-session.entity';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import { ToolSource } from 'src/modules/tool/interfaces/tool-source.interface';

export interface InstallContext {
    workspace: WorkspaceEntity;
    user: UserEntity;
    draftDisplayName: string;
    draftSource: Partial<ToolSource>;
    callbackUrl?: string;
}

export type BeginResult =
    | { sessionId: string; redirectUrl: string }
    | { sessionId: string; ready: true };

export interface CompleteParams {
    code?: string;
    connectedAccountId?: string;
    inlineConfig?: {
        serverUrl: string;
        auth?: { type: 'bearer' | 'api_key' | 'none'; paramName?: string };
        credential?: string;
    };
}

export interface ReauthContext {
    workspace: WorkspaceEntity;
    user: UserEntity;
    tool: ToolEntity;
    callbackUrl: string;
}

export interface McpAction {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
}

export interface ToolkitInstaller {
    readonly provider: ENUM_MCP_PROVIDER;
    begin(ctx: InstallContext): Promise<BeginResult>;
    complete(
        session: ToolInstallSessionEntity,
        params: CompleteParams
    ): Promise<ToolEntity>;
    reauth(ctx: ReauthContext): Promise<BeginResult>;
    discover(tool: ToolEntity): Promise<McpAction[]>;
}

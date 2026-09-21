import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { ComposioApi } from 'src/common/composio/composio-api.service';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ToolInstallSessionEntity } from 'src/modules/tool/repository/entities/tool-install-session.entity';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { ToolInstallSessionRepository } from 'src/modules/tool/repository/repositories/tool-install-session.repository';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { SlugMinter } from 'src/modules/tool/services/slug-minter.service';
import {
    BeginResult,
    CompleteParams,
    InstallContext,
    McpAction,
    ReauthContext,
    ToolkitInstaller,
} from './toolkit-installer.interface';

@Injectable()
export class ComposioToolkitInstaller implements ToolkitInstaller {
    readonly provider = ENUM_MCP_PROVIDER.COMPOSIO;

    private readonly logger = new Logger(ComposioToolkitInstaller.name);

    constructor(
        private readonly api: ComposioApi,
        private readonly toolRepo: ToolRepository,
        private readonly sessionRepo: ToolInstallSessionRepository,
        private readonly slugMinter: SlugMinter,
        private readonly em: EntityManager
    ) {}

    async begin(ctx: InstallContext): Promise<BeginResult> {
        const toolkit = (ctx.draftSource as any).toolkit as string | undefined;
        if (!toolkit) {
            throw new BadRequestException(
                'draftSource.toolkit is required for COMPOSIO provider'
            );
        }

        const authConfigId = await this.api.ensureAuthConfig(toolkit);

        const session = this.em.create(ToolInstallSessionEntity, {
            workspace: ctx.workspace,
            provider: ENUM_MCP_PROVIDER.COMPOSIO,
            draftDisplayName: ctx.draftDisplayName,
            draftSource: {
                kind: 'COMPOSIO',
                toolkit,
                connectedAccountId: null,
                authConfigId,
            },
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        await this.em.persistAndFlush(session);

        if (authConfigId === null) {
            // No-auth toolkit: session created, caller must call complete() immediately.
            return { sessionId: session.id, ready: true };
        }

        const { redirectUrl } = await this.api.linkConnectedAccount({
            authConfigId,
            userId: ctx.user.id,
            callbackUrl: ctx.callbackUrl
                ? `${ctx.callbackUrl}?sessionId=${session.id}`
                : `?sessionId=${session.id}`,
        });

        return { sessionId: session.id, redirectUrl };
    }

    async complete(
        session: ToolInstallSessionEntity,
        params: CompleteParams
    ): Promise<ToolEntity> {
        if (session.expiresAt < new Date()) {
            throw new BadRequestException('Install session has expired');
        }

        const src = session.draftSource as any;
        const toolkit = src.toolkit as string;
        const authConfigId = src.authConfigId as string | null;
        const connId =
            params.connectedAccountId ??
            (src.connectedAccountId as string | null);

        let mcpUrl: string;

        if (connId === null || connId === undefined) {
            // No-auth toolkit
            const { id: mcpServerId } = await this.api.findOrCreateMcpServer({
                toolkitSlug: toolkit,
            });
            mcpUrl = await this.api.generateMcpUrl({ serverId: mcpServerId });
        } else {
            const { authConfigId: resolvedAuthConfigId, userId } =
                await this.api.getConnectedAccount(connId);
            const { id: mcpServerId } = await this.api.findOrCreateMcpServer({
                authConfigId: resolvedAuthConfigId,
                toolkitSlug: toolkit,
            });
            mcpUrl = await this.api.generateMcpUrl({
                serverId: mcpServerId,
                connectedAccountIds: [connId],
                userIds: userId ? [userId] : undefined,
            });
        }

        const slug = await this.slugMinter.mint(
            `composio-${toolkit}`,
            (session.workspace as any).id
        );

        const tool = await this.toolRepo.create(
            {
                workspace: session.workspace,
                kind: ENUM_TOOL_KIND.MCP,
                mcpProvider: ENUM_MCP_PROVIDER.COMPOSIO,
                slug,
                displayName: session.draftDisplayName,
                source: {
                    kind: 'COMPOSIO',
                    toolkit,
                    connectedAccountId: connId ?? null,
                },
                description: `Composio toolkit: ${toolkit}`,
                mcpServerUrl: mcpUrl,
                status: ENUM_TOOL_STATUS.ACTIVE,
            } as any,
            {
                em: this.em,
                persist: true,
            }
        );

        // Best-effort discovery via Composio REST API (not MCP transport)
        try {
            const actions = await this.api.listToolkitActions(toolkit);
            tool.discoveredActions = actions;
            tool.discoveryAt = new Date();
            await this.em.flush();
        } catch (err) {
            this.logger.error(
                `Discovery failed for session ${session.id}: ${String(err)}`
            );
        }

        // Hard-delete the session
        await this.em.nativeDelete(ToolInstallSessionEntity, {
            id: session.id,
        });

        return tool;
    }

    async reauth(ctx: ReauthContext): Promise<BeginResult> {
        const { tool } = ctx;
        const toolkit = (
            tool.source as { kind: string; toolkit?: string } | undefined
        )?.toolkit;
        if (!toolkit) {
            throw new BadRequestException('Tool has no toolkit set in source');
        }

        // Reset MCP fields on the tool (keep current status while reauth is in progress)
        tool.mcpServerUrl = undefined;
        tool.mcpAuth = undefined;
        tool.mcpCredential = undefined;
        tool.discoveredActions = undefined;
        tool.discoveryAt = undefined;
        await this.em.flush();

        const authConfigId = await this.api.ensureAuthConfig(toolkit);

        // Create a new session for reauth
        const session = this.em.create(ToolInstallSessionEntity, {
            workspace: ctx.workspace,
            provider: ENUM_MCP_PROVIDER.COMPOSIO,
            draftDisplayName: tool.displayName,
            draftSource: {
                kind: 'COMPOSIO',
                toolkit,
                connectedAccountId: null,
                authConfigId,
            },
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        await this.em.persistAndFlush(session);

        if (authConfigId === null) {
            // No-auth toolkit: session created, caller must call complete() immediately.
            return { sessionId: session.id, ready: true };
        }

        const { redirectUrl } = await this.api.linkConnectedAccount({
            authConfigId,
            userId: ctx.user.id,
            callbackUrl: `${ctx.callbackUrl}?sessionId=${session.id}`,
        });

        return { sessionId: session.id, redirectUrl };
    }

    async discover(tool: ToolEntity): Promise<McpAction[]> {
        const toolkit = (tool.source as { toolkit?: string } | undefined)
            ?.toolkit;
        if (!toolkit) {
            this.logger.warn(
                `Cannot discover actions for tool ${tool.id}: no toolkit in source`
            );
            return [];
        }
        return this.api.listToolkitActions(toolkit);
    }
}

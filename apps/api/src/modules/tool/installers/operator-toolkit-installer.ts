import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomUUID as uuidV4 } from 'node:crypto';
import { EntityManager } from '@mikro-orm/postgresql';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ToolInstallSessionEntity } from 'src/modules/tool/repository/entities/tool-install-session.entity';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { ToolInstallSessionRepository } from 'src/modules/tool/repository/repositories/tool-install-session.repository';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { McpDiscoveryService } from 'src/modules/tool/services/mcp-discovery.service';
import { SlugMinter } from 'src/modules/tool/services/slug-minter.service';
import {
    BeginResult,
    CompleteParams,
    InstallContext,
    McpAction,
    ReauthContext,
    ToolkitInstaller,
} from './toolkit-installer.interface';

function slugify(input: string): string {
    return input
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

@Injectable()
export class OperatorToolkitInstaller implements ToolkitInstaller {
    readonly provider = ENUM_MCP_PROVIDER.OPERATOR;

    private readonly logger = new Logger(OperatorToolkitInstaller.name);

    constructor(
        private readonly toolRepo: ToolRepository,
        private readonly sessionRepo: ToolInstallSessionRepository,
        private readonly slugMinter: SlugMinter,
        private readonly discovery: McpDiscoveryService,
        private readonly enc: HelperEncryptionService,
        private readonly em: EntityManager
    ) {}

    async begin(ctx: InstallContext): Promise<BeginResult> {
        const src = ctx.draftSource as any;
        const serverUrl = src.serverUrl ?? '';

        const session = this.em.create(ToolInstallSessionEntity, {
            workspace: ctx.workspace,
            provider: ENUM_MCP_PROVIDER.OPERATOR,
            draftDisplayName: ctx.draftDisplayName,
            draftSource: { kind: 'OPERATOR', serverUrl },
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        await this.em.persistAndFlush(session);

        return { sessionId: session.id, ready: true };
    }

    async complete(
        session: ToolInstallSessionEntity,
        params: CompleteParams
    ): Promise<ToolEntity> {
        if (session.expiresAt < new Date()) {
            throw new BadRequestException('Install session has expired');
        }

        const src = session.draftSource as any;
        const serverUrl =
            params.inlineConfig?.serverUrl ?? (src.serverUrl as string) ?? '';

        const slug = await this.slugMinter.mint(
            slugify(session.draftDisplayName),
            (session.workspace as any).id
        );

        const mcpAuth = params.inlineConfig?.auth ?? {
            type: 'bearer' as const,
        };

        const toolData: any = {
            workspace: session.workspace,
            kind: ENUM_TOOL_KIND.MCP,
            mcpProvider: ENUM_MCP_PROVIDER.OPERATOR,
            slug,
            displayName: session.draftDisplayName,
            description: `Operator MCP tool: ${session.draftDisplayName}`,
            mcpServerUrl: serverUrl,
            mcpAuth,
            status: ENUM_TOOL_STATUS.ACTIVE,
        };

        const tool = await this.toolRepo.create(toolData, {
            em: this.em,
            persist: true,
        });

        if (params.inlineConfig?.credential) {
            tool.mcpCredential = this.enc.envelopeEncrypt(
                params.inlineConfig.credential
            );
            await this.em.flush();
        }

        // Best-effort discovery
        try {
            const actions = await this.discovery.discover(tool);
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

    async reauth(_ctx: ReauthContext): Promise<BeginResult> {
        // Operator MCP URLs don't expire; the operator updates the server URL directly in the edit drawer.
        // Return a placeholder sessionId — callers must check ready: true and skip any session lookup.
        return { sessionId: uuidV4(), ready: true };
    }

    async discover(tool: ToolEntity): Promise<McpAction[]> {
        return this.discovery.discover(tool);
    }
}

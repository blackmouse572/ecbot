import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { ECCHO_TOOLKITS } from 'src/modules/tool/constants/eccho-toolkits.constant';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ToolInstallSessionEntity } from 'src/modules/tool/repository/entities/tool-install-session.entity';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
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

@Injectable()
export class EcchoToolkitInstaller implements ToolkitInstaller {
    readonly provider = ENUM_MCP_PROVIDER.ECCHO;

    private readonly logger = new Logger(EcchoToolkitInstaller.name);

    constructor(
        private readonly toolRepo: ToolRepository,
        private readonly slugMinter: SlugMinter,
        private readonly discovery: McpDiscoveryService,
        private readonly enc: HelperEncryptionService,
        private readonly em: EntityManager
    ) {}

    async begin(ctx: InstallContext): Promise<BeginResult> {
        const service = (ctx.draftSource as any).service as string;
        const def = ECCHO_TOOLKITS.find(t => t.slug === service);
        if (!def)
            throw new BadRequestException(`Unknown Ecbot service: ${service}`);

        const session = this.em.create(ToolInstallSessionEntity, {
            workspace: ctx.workspace,
            provider: ENUM_MCP_PROVIDER.ECCHO,
            draftDisplayName: ctx.draftDisplayName,
            draftSource: { kind: 'ECCHO', service },
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        await this.em.persistAndFlush(session);

        const echoCallback = ctx.callbackUrl
            ? `${ctx.callbackUrl}?sessionId=${session.id}`
            : `?sessionId=${session.id}`;

        const redirectUrl = `${def.baseUrl}${def.authorizePath}?redirect_uri=${encodeURIComponent(echoCallback)}`;
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
        const service = src.service as string;
        const def = ECCHO_TOOLKITS.find(t => t.slug === service);
        if (!def)
            throw new BadRequestException(`Unknown Ecbot service: ${service}`);

        const serverUrl = `${def.baseUrl}${def.mcpPath}`;
        const slug = await this.slugMinter.mint(
            `eccho-${service}`,
            (session.workspace as any).id
        );

        const tool = await this.toolRepo.create(
            {
                workspace: session.workspace,
                kind: ENUM_TOOL_KIND.MCP,
                mcpProvider: ENUM_MCP_PROVIDER.ECCHO,
                slug,
                displayName: session.draftDisplayName,
                description: def.description,
                mcpServerUrl: serverUrl,
                mcpAuth: { type: 'bearer' },
                source: { kind: 'ECCHO', service },
                status: ENUM_TOOL_STATUS.ACTIVE,
            } as any,
            { em: this.em, persist: true }
        );

        if (params.code) {
            tool.mcpCredential = this.enc.envelopeEncrypt(params.code);
            await this.em.flush();
        }

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

        await this.em.nativeDelete(ToolInstallSessionEntity, {
            id: session.id,
        });
        return tool;
    }

    async reauth(ctx: ReauthContext): Promise<BeginResult> {
        const src = (ctx.tool as any).source as any;
        const service = src?.service as string;
        const def = ECCHO_TOOLKITS.find(t => t.slug === service);
        if (!def)
            throw new BadRequestException(`Unknown Ecbot service: ${service}`);

        const session = this.em.create(ToolInstallSessionEntity, {
            workspace: ctx.workspace,
            provider: ENUM_MCP_PROVIDER.ECCHO,
            draftDisplayName: ctx.tool.displayName,
            draftSource: { kind: 'ECCHO', service },
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        await this.em.persistAndFlush(session);

        const echoCallback = `${ctx.callbackUrl}?sessionId=${session.id}`;
        const redirectUrl = `${def.baseUrl}${def.authorizePath}?redirect_uri=${encodeURIComponent(echoCallback)}`;
        return { sessionId: session.id, redirectUrl };
    }

    async discover(tool: ToolEntity): Promise<McpAction[]> {
        return this.discovery.discover(tool);
    }
}

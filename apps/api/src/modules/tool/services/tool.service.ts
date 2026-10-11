import {
    BadGatewayException,
    BadRequestException,
    ConflictException,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { IPaginationOrder } from 'src/common/pagination/interfaces/pagination.interface';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';
import { ChatbotToolRepository } from 'src/modules/tool/repository/repositories/chatbot-tool.repository';
import { ToolInvocationRepository } from 'src/modules/tool/repository/repositories/tool-invocation.repository';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { CreateHttpToolRequestDto } from 'src/modules/tool/dtos/request/create-http-tool.request.dto';
import { CreateMcpToolRequestDto } from 'src/modules/tool/dtos/request/create-mcp-tool.request.dto';
import { UpdateToolRequestDto } from 'src/modules/tool/dtos/request/update-tool.request.dto';
import { TestInlineToolRequestDto } from 'src/modules/tool/dtos/request/test-tool.request.dto';
import { ToolListResponseDto } from 'src/modules/tool/dtos/response/tool.list.response.dto';
import { ToolResponseDto } from 'src/modules/tool/dtos/response/tool.response.dto';
import {
    ToolAdminListResponseDto,
    ToolAdminResponseDto,
    ToolInvocationStatsResponseDto,
} from 'src/modules/tool/dtos/response/tool.admin.response.dto';
import { ENUM_MCP_PROVIDER } from 'src/modules/tool/enums/mcp-provider.enum';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';
import { ToolEntity } from 'src/modules/tool/repository/entities/tool.entity';
import { ToolInvocationEntity } from 'src/modules/tool/repository/entities/tool-invocation.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { McpDiscoveryService } from './mcp-discovery.service';
import {
    HttpToolExecutorService,
    ExecutionResult,
} from './http-tool-executor.service';
import { SlugMinter } from './slug-minter.service';
import { InstallerRegistry } from 'src/modules/tool/installers/installer-registry.service';
import { MCP_AUTH_TYPES } from 'src/modules/tool/constants/tool.constant';
import { sameAuth } from 'src/modules/tool/utils/same-auth.util';

function slugify(s: string): string {
    return s
        .toLowerCase()
        .replace(/[\s_]+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
}

@Injectable()
export class ToolService {
    private readonly logger = new Logger(ToolService.name);

    constructor(
        private readonly toolRepo: ToolRepository,
        private readonly chatbotToolRepo: ChatbotToolRepository,
        private readonly toolInvocationRepo: ToolInvocationRepository,
        private readonly enc: HelperEncryptionService,
        private readonly discovery: McpDiscoveryService,
        private readonly http: HttpToolExecutorService,
        private readonly slugMinter: SlugMinter,
        private readonly installerRegistry: InstallerRegistry
    ) {}

    async createHttp(
        workspaceId: string,
        dto: CreateHttpToolRequestDto,
        createdBy?: UserEntity
    ): Promise<ToolEntity> {
        const displayName = (dto as any).displayName ?? dto.name ?? '';
        const slug = await this.slugMinter.mint(
            slugify(displayName),
            workspaceId
        );
        const entity = await this.toolRepo.create({
            workspace: { id: workspaceId } as any,
            kind: ENUM_TOOL_KIND.HTTP,
            slug,
            displayName,
            description: dto.description,
            status: ENUM_TOOL_STATUS.ACTIVE,
            httpMethod: dto.httpMethod,
            httpUrl: dto.httpUrl,
            httpInputSchema: dto.inputSchema,
            httpHeaders: dto.headers,
            httpAuth: dto.auth,
            httpCredential: dto.credential
                ? this.enc.envelopeEncrypt(dto.credential)
                : undefined,
            timeoutMs: dto.timeoutMs ?? 10000,
            maxRetries: dto.maxRetries ?? 1,
        });
        if (createdBy) entity.createdBy = createdBy;
        await this.toolRepo.getEntityManager().flush();
        return entity;
    }

    /**
     * Create an operator-supplied MCP server tool. Provider is OPERATOR
     * (vs COMPOSIO for marketplace installs). The server is asked for its
     * actions first, so an unreachable URL or a bad credential is reported
     * and nothing is saved (#175).
     */
    async createMcpOperator(
        workspaceId: string,
        dto: CreateMcpToolRequestDto,
        createdBy?: UserEntity
    ): Promise<ToolEntity> {
        const connection = {
            mcpServerUrl: dto.serverUrl,
            mcpAuth: dto.auth,
            mcpCredential: dto.credential
                ? this.enc.envelopeEncrypt(dto.credential)
                : undefined,
        };
        const actions = await this.testMcpConnection(connection);
        const displayName = (dto as any).displayName ?? dto.name ?? '';
        const slug = await this.slugMinter.mint(
            slugify(displayName),
            workspaceId
        );
        const entity = await this.toolRepo.create({
            workspace: { id: workspaceId } as any,
            kind: ENUM_TOOL_KIND.MCP,
            mcpProvider: ENUM_MCP_PROVIDER.OPERATOR,
            slug,
            displayName,
            description: dto.description,
            status: ENUM_TOOL_STATUS.ACTIVE,
            ...connection,
            discoveredActions: actions,
            discoveryAt: new Date(),
        });
        if (createdBy) entity.createdBy = createdBy;
        await this.toolRepo.getEntityManager().flush();
        return entity;
    }

    /** Lists the server's actions, or throws 502 when it cannot be reached. */
    private async testMcpConnection(
        connection: Pick<
            ToolEntity,
            'mcpServerUrl' | 'mcpAuth' | 'mcpCredential'
        >
    ): Promise<ToolEntity['discoveredActions']> {
        try {
            return await this.discovery.discover(
                Object.assign(new ToolEntity(), connection)
            );
        } catch (err) {
            this.logger.warn(
                `MCP connection test failed for ${connection.mcpServerUrl}: ${String(err)}`
            );
            throw new BadGatewayException(
                'tool.discover.error.connectionFailed'
            );
        }
    }

    async findAllByWorkspace(
        workspaceId: string,
        find: Record<string, any>,
        options: {
            limit?: number;
            offset?: number;
            order?: IPaginationOrder;
        } = {}
    ): Promise<ToolEntity[]> {
        return this.toolRepo.findAllPaginated(
            { ...find, workspace: { id: workspaceId } },
            options
        );
    }

    async getTotalByWorkspace(
        workspaceId: string,
        find: Record<string, any>
    ): Promise<number> {
        return this.toolRepo.countAll({
            ...find,
            workspace: { id: workspaceId },
        });
    }

    mapList(tools: ToolEntity[]): ToolListResponseDto[] {
        return plainToInstance(ToolListResponseDto, tools, {
            excludeExtraneousValues: true,
        });
    }

    mapOne(tool: ToolEntity): ToolResponseDto {
        return plainToInstance(ToolResponseDto, tool, {
            excludeExtraneousValues: true,
        });
    }

    async getOne(workspaceId: string, toolId: string): Promise<ToolEntity> {
        const tool = await this.toolRepo.findOneInWorkspace(
            toolId,
            workspaceId
        );
        if (!tool) throw new NotFoundException('tool.get.error.notFound');
        return tool;
    }

    async update(
        workspaceId: string,
        toolId: string,
        dto: UpdateToolRequestDto,
        updatedBy?: UserEntity
    ): Promise<ToolEntity> {
        const tool = await this.getOne(workspaceId, toolId);
        if (tool.kind === ENUM_TOOL_KIND.MCP) {
            return this.updateMcp(tool, dto, updatedBy);
        }
        this.assertCredentialStaysWithOrigin(
            tool.httpUrl,
            dto.httpUrl,
            tool.httpCredential,
            dto
        );
        const patch: any = { ...dto };
        delete patch.serverUrl;
        // Map dto.name → displayName for backward compatibility. Slug is intentionally
        // immutable after creation (LLM-facing identity) — only displayName is editable.
        if (patch.name !== undefined) {
            patch.displayName = patch.name;
            delete patch.name;
        }
        if (dto.credential) {
            patch.httpCredential = this.enc.envelopeEncrypt(dto.credential);
            delete patch.credential;
        } else {
            delete patch.credential;
        }
        if (dto.inputSchema) {
            patch.httpInputSchema = dto.inputSchema;
            delete patch.inputSchema;
        }
        if (dto.headers) {
            patch.httpHeaders = dto.headers;
            delete patch.headers;
        }
        if (dto.auth) {
            patch.httpAuth = dto.auth;
            if (dto.auth.type === 'none') patch.httpCredential = null;
            delete patch.auth;
        }
        Object.assign(tool, patch);
        if (updatedBy) tool.updatedBy = updatedBy;
        await this.toolRepo.getEntityManager().flush();
        return tool;
    }

    /**
     * A stored credential never follows a URL to another origin: whoever
     * edits the tool may never have seen it, so moving the URL to a new
     * scheme, host or port needs the credential typed again (#247 review).
     */
    private assertCredentialStaysWithOrigin(
        savedUrl: string | undefined,
        newUrl: string | undefined,
        storedCredential: string | null | undefined,
        dto: UpdateToolRequestDto
    ): void {
        if (
            !newUrl ||
            !savedUrl ||
            !storedCredential ||
            dto.credential ||
            dto.auth?.type === 'none'
        ) {
            return;
        }
        if (new URL(newUrl).origin !== new URL(savedUrl).origin) {
            throw new BadRequestException(
                'tool.update.error.credentialRequired'
            );
        }
    }

    /**
     * An operator's MCP server can change its URL, auth and credential (#176);
     * a marketplace tool's connection belongs to its provider, so only the
     * name and description move. A new connection must answer before it is
     * saved, like on create.
     */
    private async updateMcp(
        tool: ToolEntity,
        dto: UpdateToolRequestDto,
        updatedBy?: UserEntity
    ): Promise<ToolEntity> {
        // The edit form sends the saved URL and auth back on every save, so
        // only a real difference counts as a new connection (#247 review).
        const changesConnection =
            (dto.serverUrl !== undefined &&
                dto.serverUrl !== tool.mcpServerUrl) ||
            (dto.auth !== undefined && !sameAuth(dto.auth, tool.mcpAuth)) ||
            !!dto.credential;
        if (
            changesConnection &&
            tool.mcpProvider !== ENUM_MCP_PROVIDER.OPERATOR
        ) {
            throw new BadRequestException(
                'tool.update.error.managedConnection'
            );
        }
        // MCP sends its credential as a bearer token or an API-key header
        // only; anything else would be accepted and silently ignored.
        if (
            dto.auth &&
            (!MCP_AUTH_TYPES.includes(dto.auth.type) ||
                (dto.auth.placement !== undefined &&
                    dto.auth.placement !== 'header'))
        ) {
            throw new BadRequestException('tool.update.error.invalidMcpAuth');
        }
        this.assertCredentialStaysWithOrigin(
            tool.mcpServerUrl,
            dto.serverUrl,
            tool.mcpCredential,
            dto
        );
        const connection = {
            mcpServerUrl: dto.serverUrl ?? tool.mcpServerUrl,
            mcpAuth: (dto.auth as ToolEntity['mcpAuth']) ?? tool.mcpAuth,
            mcpCredential:
                dto.auth?.type === 'none'
                    ? null
                    : dto.credential
                      ? this.enc.envelopeEncrypt(dto.credential)
                      : tool.mcpCredential,
        };
        // Test the new connection before it replaces the working one (#175).
        if (changesConnection) {
            tool.discoveredActions = await this.testMcpConnection(connection);
            tool.discoveryAt = new Date();
            Object.assign(tool, connection);
        }
        if (dto.name !== undefined) tool.displayName = dto.name;
        if (dto.description !== undefined) tool.description = dto.description;
        if (updatedBy) tool.updatedBy = updatedBy;
        await this.toolRepo.getEntityManager().flush();
        return tool;
    }

    /**
     * Returns the most recent tool invocations for a chatbot, ordered by
     * createdAt DESC. The workspace boundary is enforced by the workspace
     * policy decorator on the controller; this method trusts that and
     * delegates straight to the repository.
     */
    async listInvocations(
        _workspaceId: string,
        chatbotId: string,
        limit = 100
    ): Promise<ToolInvocationEntity[]> {
        return this.toolInvocationRepo.findRecentByChatbotId(chatbotId, limit);
    }

    async rediscover(workspaceId: string, toolId: string): Promise<ToolEntity> {
        const tool = await this.getOne(workspaceId, toolId);
        if (tool.kind !== ENUM_TOOL_KIND.MCP) {
            throw new BadRequestException('tool.discover.error.notMcp');
        }
        try {
            // Route through the per-provider installer so each provider can use
            // the appropriate discovery mechanism (e.g. Composio REST API vs MCP protocol).
            const discover = tool.mcpProvider
                ? this.installerRegistry
                      .get(tool.mcpProvider)
                      .discover.bind(
                          this.installerRegistry.get(tool.mcpProvider)
                      )
                : this.discovery.discover.bind(this.discovery);
            const actions = await discover(tool);
            tool.discoveredActions = actions;
            tool.discoveryAt = new Date();
            await this.toolRepo.getEntityManager().flush();
        } catch (err) {
            this.logger.warn(
                `MCP rediscovery failed for tool ${tool.id}: ${String(err)}`
            );
            throw new BadGatewayException(
                'tool.discover.error.connectionFailed'
            );
        }
        return tool;
    }

    async testSaved(
        workspaceId: string,
        toolId: string,
        args: Record<string, unknown>
    ): Promise<ExecutionResult> {
        const tool = await this.getOne(workspaceId, toolId);
        if (tool.kind !== ENUM_TOOL_KIND.HTTP) {
            throw new BadRequestException('tool.test.error.notHttp');
        }
        return this.http.execute(tool, args);
    }

    async testInline(dto: TestInlineToolRequestDto): Promise<ExecutionResult> {
        return this.http.executeWithConfig(
            {
                httpMethod: dto.httpMethod,
                httpUrl: dto.httpUrl,
                httpHeaders: dto.headers,
                httpAuth: dto.auth,
                plaintextCredential: dto.credential,
                timeoutMs: dto.timeoutMs,
            },
            dto.args
        );
    }

    // ---- Admin: every workspace's tools ----

    async findAllSystem(
        find: Record<string, any>,
        options: {
            limit?: number;
            offset?: number;
            order?: IPaginationOrder;
        } = {}
    ): Promise<ToolEntity[]> {
        return this.toolRepo.findAllPaginated(find, {
            ...options,
            populate: ['workspace'],
        });
    }

    async getTotalSystem(find: Record<string, any>): Promise<number> {
        return this.toolRepo.countAll(find);
    }

    async getOneAny(toolId: string): Promise<ToolEntity> {
        const tool = await this.toolRepo.findOneAny(toolId);
        if (!tool) throw new NotFoundException('tool.get.error.notFound');
        return tool;
    }

    /**
     * The admin off switch. REVOKED is set nowhere else: the manifest leaves
     * the tool out and execution refuses it until an admin activates it.
     */
    async inactivate(toolId: string): Promise<ToolEntity> {
        const tool = await this.getOneAny(toolId);
        tool.status = ENUM_TOOL_STATUS.REVOKED;
        await this.toolRepo.getEntityManager().flush();
        return tool;
    }

    /**
     * Only undoes `inactivate`. A NEEDS_REAUTH or EXPIRED tool has a broken
     * connection, and calling it ACTIVE would hide that from its owner.
     */
    async activate(toolId: string): Promise<ToolEntity> {
        const tool = await this.getOneAny(toolId);
        if (tool.status !== ENUM_TOOL_STATUS.REVOKED) {
            throw new BadRequestException('tool.activate.error.notInactive');
        }
        tool.status = ENUM_TOOL_STATUS.ACTIVE;
        await this.toolRepo.getEntityManager().flush();
        return tool;
    }

    async softDeleteAny(toolId: string): Promise<ToolEntity> {
        return this.remove(await this.getOneAny(toolId));
    }

    async getInvocationStats(
        toolId: string
    ): Promise<ToolInvocationStatsResponseDto> {
        const [counts, lastInvokedAt] = await Promise.all([
            this.toolInvocationRepo.countByStatus(toolId),
            this.toolInvocationRepo.findLastInvokedAt(toolId),
        ]);
        return {
            total: counts.SUCCESS + counts.ERROR + counts.TIMEOUT,
            success: counts.SUCCESS,
            error: counts.ERROR,
            timeout: counts.TIMEOUT,
            lastInvokedAt,
        };
    }

    mapAdminList(tools: ToolEntity[]): ToolAdminListResponseDto[] {
        return plainToInstance(ToolAdminListResponseDto, tools, {
            excludeExtraneousValues: true,
        });
    }

    mapAdminOne(
        tool: ToolEntity,
        invocationStats: ToolInvocationStatsResponseDto
    ): ToolAdminResponseDto {
        return plainToInstance(
            ToolAdminResponseDto,
            { ...tool, invocationStats },
            { excludeExtraneousValues: true }
        );
    }

    async softDelete(workspaceId: string, toolId: string): Promise<ToolEntity> {
        return this.remove(await this.getOne(workspaceId, toolId));
    }

    private async remove(tool: ToolEntity): Promise<ToolEntity> {
        const refs = await this.chatbotToolRepo.count({
            tool: { id: tool.id },
            enabled: true,
        });
        if (refs > 0)
            throw new ConflictException('tool.delete.error.referenced');
        tool.deleted = true;
        tool.deletedAt = new Date();
        await this.toolRepo.getEntityManager().flush();
        return tool;
    }
}

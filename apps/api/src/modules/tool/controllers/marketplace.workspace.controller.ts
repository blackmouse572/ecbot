import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { PaginationQuery } from 'src/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from 'src/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from 'src/common/pagination/services/pagination.service';
import { Response } from 'src/common/response/decorators/response.decorator';
import { ResponsePaging } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { IResponsePaging } from 'src/common/response/interfaces/response.interface';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import {
    MarketplaceWorkspaceCatalogDoc,
    MarketplaceWorkspaceCategoriesDoc,
    MarketplaceWorkspaceCompleteInstallDoc,
    MarketplaceWorkspaceInstallDoc,
    MarketplaceWorkspaceReauthDoc,
    MarketplaceWorkspaceToolkitDetailDoc,
} from 'src/modules/tool/docs/marketplace.workspace.doc';
import { CompleteInstallRequestDto } from 'src/modules/tool/dtos/request/complete-install.request.dto';
import { InstallMarketplaceRequestDto } from 'src/modules/tool/dtos/request/install-marketplace.request.dto';
import { ReauthMarketplaceRequestDto } from 'src/modules/tool/dtos/request/reauth-marketplace.request.dto';
import { ComposioCatalogService } from 'src/modules/tool/services/composio-catalog.service';
import { EcchoCatalogService } from 'src/modules/tool/services/eccho-catalog.service';
import { UserProtected } from 'src/modules/user/decorators/user.decorator';
import {
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from 'src/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';
import {
    ComposioToolkit,
    ComposioToolkitDetail,
} from '../interfaces/composio.interface';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { ToolInstallResponseDto } from '../dtos/response/tool-install.response.dto';
import { InstallerRegistry } from '../installers/installer-registry.service';
import { ToolInstallSessionRepository } from '../repository/repositories/tool-install-session.repository';
import { ToolRepository } from '../repository/repositories/tool.repository';
import { ENUM_MCP_PROVIDER } from '../enums/mcp-provider.enum';

@ApiTags('modules.workspace.marketplace')
@Controller({
    version: '1',
    path: '/:workspace/tool/marketplace',
})
export class MarketplaceWorkspaceController {
    constructor(
        private readonly catalog: ComposioCatalogService,
        private readonly ecchoCatalog: EcchoCatalogService,
        private readonly registry: InstallerRegistry,
        private readonly toolRepo: ToolRepository,
        private readonly sessionRepo: ToolInstallSessionRepository,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService
    ) {}

    @MarketplaceWorkspaceCategoriesDoc()
    @Response('tool.marketplace.categories.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/catalog/categories')
    async getCategories(): Promise<IResponse<{ id: string; name: string }[]>> {
        const [composio, eccho] = await Promise.all([
            this.catalog.getCategories(),
            Promise.resolve(this.ecchoCatalog.getCategories()),
        ]);

        // Merge, dedup by id — Ecbot categories first
        const seen = new Set<string>();
        const merged: { id: string; name: string }[] = [];
        for (const c of [...eccho, ...composio]) {
            if (!seen.has(c.id)) {
                seen.add(c.id);
                merged.push(c);
            }
        }

        return { data: merged };
    }

    @MarketplaceWorkspaceCatalogDoc()
    @ResponsePaging('tool.marketplace.catalog.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/catalog')
    async getCatalog(
        @PaginationQuery() { _limit, _offset }: PaginationListDto,
        @Query('category') category?: string,
        @Query('search') search?: string
    ): Promise<IResponsePaging<ComposioToolkit>> {
        // Ecbot catalog is small — fetch all matching items, then offset into Composio
        const eccho = this.ecchoCatalog.getToolkits({
            category,
            search,
            limit: 999,
            offset: 0,
        });
        const echoPage = eccho.items.slice(_offset, _offset + _limit);
        const echoConsumed = echoPage.length;

        const composioOffset = Math.max(0, _offset - eccho.total);
        const composioLimit = _limit - echoConsumed;

        const composio =
            composioLimit > 0
                ? await this.catalog.getToolkits({
                      category,
                      search,
                      limit: composioLimit,
                      offset: composioOffset,
                  })
                : { items: [], total: 0 };

        const total = eccho.total + composio.total;
        const totalPage = this.paginationService.totalPage(total, _limit);

        return {
            _pagination: { total, totalPage },
            data: [...echoPage, ...composio.items],
        };
    }

    @MarketplaceWorkspaceToolkitDetailDoc()
    @Response('tool.marketplace.toolkit.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/toolkits/:slug')
    async getToolkitBySlug(
        @Param('slug') slug: string
    ): Promise<IResponse<ComposioToolkitDetail | null>> {
        // Check Ecbot catalog first, fall back to Composio
        const ecchoDef = this.ecchoCatalog.findBySlug(slug);
        if (ecchoDef) {
            const detail = {
                slug: ecchoDef.slug,
                name: ecchoDef.name,
                meta: {
                    description: ecchoDef.description,
                    logo: ecchoDef.logo ?? '',
                    categories: ecchoDef.categories,
                },
            } as unknown as ComposioToolkitDetail;
            return { data: detail };
        }

        const detail = await this.catalog.getToolkitBySlug(slug);
        return { data: detail };
    }

    @MarketplaceWorkspaceInstallDoc()
    @Response('tool.marketplace.install.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/install')
    async startInstall(
        @WorkspacePayload() ws: WorkspaceEntity,
        @Body() dto: InstallMarketplaceRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ToolInstallResponseDto>> {
        // Route to Ecbot installer if the slug belongs to an Ecbot-managed tool
        const ecchoDef = this.ecchoCatalog.findBySlug(dto.toolkitSlug);
        if (ecchoDef) {
            const installer = this.registry.get(ENUM_MCP_PROVIDER.ECCHO);
            const result = await installer.begin({
                workspace: ws,
                user,
                draftDisplayName: dto.displayName ?? ecchoDef.name,
                draftSource: { kind: 'ECCHO', service: dto.toolkitSlug } as any,
                callbackUrl: dto.callbackUrl,
            });

            await this.activityService.createByUserWithWorkspace(user, ws, {
                action: ENUM_ACTIVITY_ACTION.TOOL_START_INSTALL,
                subject: ENUM_POLICY_SUBJECT.TOOL,
                metadata: {
                    id: dto.toolkitSlug,
                    name: dto.displayName ?? ecchoDef.name,
                },
            });

            return {
                data: {
                    sessionId: result.sessionId,
                    ...('redirectUrl' in result
                        ? { redirectUrl: result.redirectUrl }
                        : {}),
                } as any,
            };
        }

        // Default: Composio
        const installer = this.registry.get(ENUM_MCP_PROVIDER.COMPOSIO);
        const draftDisplayName = dto.displayName ?? dto.toolkitSlug;
        const result = await installer.begin({
            workspace: ws,
            user,
            draftDisplayName,
            draftSource: { kind: 'COMPOSIO', toolkit: dto.toolkitSlug } as any,
            callbackUrl: dto.callbackUrl,
        });

        if ('ready' in result) {
            // No-auth toolkit: complete immediately
            const session = await this.sessionRepo.findById(result.sessionId);
            if (!session)
                throw new BadRequestException('Install session not found');
            const tool = await installer.complete(session, {});

            await this.activityService.createByUserWithWorkspace(user, ws, {
                action: ENUM_ACTIVITY_ACTION.TOOL_COMPLETE_INSTALL,
                subject: ENUM_POLICY_SUBJECT.TOOL,
                metadata: {
                    id: tool.id,
                    name: draftDisplayName,
                },
            });

            return {
                data: { sessionId: result.sessionId, toolId: tool.id } as any,
            };
        }

        await this.activityService.createByUserWithWorkspace(user, ws, {
            action: ENUM_ACTIVITY_ACTION.TOOL_START_INSTALL,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: {
                id: dto.toolkitSlug,
                name: draftDisplayName,
            },
        });

        return {
            data: {
                sessionId: result.sessionId,
                redirectUrl: result.redirectUrl,
            } as any,
        };
    }

    @MarketplaceWorkspaceReauthDoc()
    @Response('tool.marketplace.install.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/reauth')
    async reauth(
        @WorkspacePayload() ws: WorkspaceEntity,
        @Body() dto: ReauthMarketplaceRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<ToolInstallResponseDto>> {
        const tool = await this.toolRepo.findOneInWorkspace(dto.toolId, ws.id);
        if (!tool) throw new NotFoundException('tool.get.error.notFound');

        const installer = this.registry.get(
            tool.mcpProvider ?? ENUM_MCP_PROVIDER.COMPOSIO
        );
        const result = await installer.reauth({
            workspace: ws,
            user,
            tool,
            callbackUrl: dto.callbackUrl,
        });

        if ('ready' in result) {
            return { data: { sessionId: result.sessionId } as any };
        }

        await this.activityService.createByUserWithWorkspace(user, ws, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: {
                id: dto.toolId,
                name: tool.displayName,
            },
        });

        return {
            data: {
                sessionId: result.sessionId,
                redirectUrl: result.redirectUrl,
            } as any,
        };
    }

    @MarketplaceWorkspaceCompleteInstallDoc()
    @Response('tool.marketplace.complete.success')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.TOOL,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/complete-install')
    async completeInstall(
        @WorkspacePayload() ws: WorkspaceEntity,
        @Body() dto: CompleteInstallRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<{ id: string; status: string }>> {
        const session = await this.sessionRepo.findById(dto.sessionId);
        if (!session)
            throw new NotFoundException('Install session not found or expired');
        // Enforce workspace boundary — session must belong to the requesting workspace
        if ((session.workspace as any).id !== ws.id) {
            throw new NotFoundException('Install session not found or expired');
        }
        const installer = this.registry.get(session.provider);
        const tool = await installer.complete(session, {
            connectedAccountId: dto.connectedAccountId,
            code: dto.code,
        });

        await this.activityService.createByUserWithWorkspace(user, ws, {
            action: ENUM_ACTIVITY_ACTION.TOOL_COMPLETE_INSTALL,
            subject: ENUM_POLICY_SUBJECT.TOOL,
            metadata: {
                id: tool.id,
                name: tool.displayName,
            },
        });

        return { data: { id: tool.id, status: tool.status } };
    }
}

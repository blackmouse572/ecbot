import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UpdateToolkitRequestDto } from '../dtos/request/update-toolkit.request.dto';
import {
    ToolkitAdminComposioStatusResponseDto,
    ToolkitAdminEcchoDetailResponseDto,
    ToolkitAdminEcchoResponseDto,
    ToolkitAdminResponseDto,
} from '../dtos/response/toolkit.admin.response.dto';
import { ENUM_MCP_PROVIDER } from '../enums/mcp-provider.enum';
import { ComposioToolkit } from '../interfaces/composio.interface';
import { IToolkitUsage } from '../interfaces/toolkit-usage.interface';
import { ToolkitOverrideEntity } from '../repository/entities/toolkit-override.entity';
import { ToolRepository } from '../repository/repositories/tool.repository';
import { ToolkitOverrideRepository } from '../repository/repositories/toolkit-override.repository';
import { ComposioCatalogService } from './composio-catalog.service';
import { EcchoCatalogService } from './eccho-catalog.service';

const TOOLS_SHOWN = 50;
const NO_USAGE: IToolkitUsage = { workspaceCount: 0, toolCount: 0 };

/** Read side of the admin toolkit pages: catalogs plus install counts. */
@Injectable()
export class ToolkitAdminService {
    constructor(
        private readonly toolRepository: ToolRepository,
        private readonly overrideRepository: ToolkitOverrideRepository,
        private readonly ecchoCatalog: EcchoCatalogService,
        private readonly composioCatalog: ComposioCatalogService,
        private readonly config: ConfigService
    ) {}

    async listEccho(): Promise<ToolkitAdminEcchoResponseDto[]> {
        const items = await this.ecchoCatalog.listMerged();
        const usage = await this.toolRepository.countUsageByToolkit(
            ENUM_MCP_PROVIDER.ECCHO
        );
        return items.map(toolkit =>
            plainToInstance(
                ToolkitAdminEcchoResponseDto,
                {
                    ...this.toRow(toolkit, usage),
                    configured: !!toolkit.baseUrl,
                    disabled: toolkit.disabled,
                },
                { excludeExtraneousValues: true }
            )
        );
    }

    async getEccho(slug: string): Promise<ToolkitAdminEcchoDetailResponseDto> {
        const [toolkit, override, usage, tools] = await Promise.all([
            this.ecchoCatalog.findMergedBySlug(slug),
            this.overrideRepository.findBySlug(slug),
            this.toolRepository.countUsageByToolkit(ENUM_MCP_PROVIDER.ECCHO),
            this.toolRepository.findByEcchoToolkit(slug, TOOLS_SHOWN),
        ]);
        const def = this.ecchoCatalog.findBySlug(slug);
        if (!toolkit || !def) {
            throw new NotFoundException(
                'tool.marketplace.toolkit.error.notFound'
            );
        }

        return plainToInstance(
            ToolkitAdminEcchoDetailResponseDto,
            {
                ...this.toRow(toolkit, usage),
                configured: !!def.baseUrl,
                disabled: toolkit.disabled,
                defaults: {
                    name: def.name,
                    description: def.description,
                    logo: def.logo,
                    categories: def.categories,
                },
                overriddenFields: (
                    ['name', 'description', 'logo', 'categories'] as const
                ).filter(field => override?.[field] != null),
                tools: tools.map(tool => ({
                    id: tool.id,
                    displayName: tool.displayName,
                    status: tool.status,
                    createdAt: tool.createdAt,
                    workspaceId: tool.workspace.id,
                    workspaceName: tool.workspace.name,
                })),
            },
            { excludeExtraneousValues: true }
        );
    }

    async updateEccho(
        slug: string,
        dto: UpdateToolkitRequestDto,
        user: UserEntity
    ): Promise<ToolkitAdminEcchoDetailResponseDto> {
        if (!this.ecchoCatalog.findBySlug(slug)) {
            throw new NotFoundException(
                'tool.marketplace.toolkit.error.notFound'
            );
        }

        const patch: Partial<ToolkitOverrideEntity> = {};
        for (const field of [
            'name',
            'description',
            'logo',
            'categories',
            'disabled',
        ] as const) {
            if (dto[field] !== undefined) {
                Object.assign(patch, { [field]: dto[field] });
            }
        }

        const existing = await this.overrideRepository.findBySlug(slug);
        if (existing) {
            Object.assign(existing, patch);
            await this.overrideRepository.save(existing, { actionBy: user.id });
        } else {
            await this.overrideRepository.create(
                { slug, ...patch },
                { actionBy: user.id }
            );
        }

        return this.getEccho(slug);
    }

    async listComposio(params: {
        search?: string;
        limit: number;
        offset: number;
    }): Promise<{ items: ToolkitAdminResponseDto[]; total: number }> {
        const [page, usage] = await Promise.all([
            this.composioCatalog.getToolkits(params),
            this.toolRepository.countUsageByToolkit(ENUM_MCP_PROVIDER.COMPOSIO),
        ]);
        return {
            total: page.total,
            items: page.items.map(toolkit =>
                plainToInstance(
                    ToolkitAdminResponseDto,
                    this.toRow(toolkit, usage),
                    { excludeExtraneousValues: true }
                )
            ),
        };
    }

    async composioStatus(): Promise<ToolkitAdminComposioStatusResponseDto> {
        const apiKeyConfigured = !!this.config.get<string>('composio.apiKey');
        const usage = await this.toolRepository.countUsageByToolkit(
            ENUM_MCP_PROVIDER.COMPOSIO
        );
        // The catalog swallows Composio errors into an empty page, so an
        // empty catalog with a key set means Composio did not answer.
        const toolkitCount = apiKeyConfigured
            ? (await this.composioCatalog.getToolkits({ limit: 1, offset: 0 }))
                  .total
            : 0;
        const counts = [...usage.values()];

        return plainToInstance(
            ToolkitAdminComposioStatusResponseDto,
            {
                apiKeyConfigured,
                reachable: toolkitCount > 0,
                baseUrl: this.config.get<string>('composio.baseUrl'),
                toolkitCount,
                installedToolkitCount: counts.length,
                toolCount: counts.reduce((sum, c) => sum + c.toolCount, 0),
            },
            { excludeExtraneousValues: true }
        );
    }

    private toRow(
        toolkit: ComposioToolkit,
        usage: Map<string, IToolkitUsage>
    ): Record<string, unknown> {
        return {
            ...toolkit,
            categories: toolkit.categories ?? [],
            ...(usage.get(toolkit.slug) ?? NO_USAGE),
        };
    }
}

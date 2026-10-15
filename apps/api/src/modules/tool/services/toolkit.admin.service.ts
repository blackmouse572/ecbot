import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { ECCHO_TOOLKITS } from '../constants/eccho-toolkits.constant';
import {
    ToolkitAdminComposioStatusResponseDto,
    ToolkitAdminEcchoResponseDto,
    ToolkitAdminResponseDto,
} from '../dtos/response/toolkit.admin.response.dto';
import { ENUM_MCP_PROVIDER } from '../enums/mcp-provider.enum';
import { ComposioToolkit } from '../interfaces/composio.interface';
import { IToolkitUsage } from '../interfaces/toolkit-usage.interface';
import { ToolRepository } from '../repository/repositories/tool.repository';
import { ComposioCatalogService } from './composio-catalog.service';
import { EcchoCatalogService } from './eccho-catalog.service';

const NO_USAGE: IToolkitUsage = { workspaceCount: 0, toolCount: 0 };

/** Read side of the admin toolkit pages: catalogs plus install counts. */
@Injectable()
export class ToolkitAdminService {
    constructor(
        private readonly toolRepository: ToolRepository,
        private readonly ecchoCatalog: EcchoCatalogService,
        private readonly composioCatalog: ComposioCatalogService,
        private readonly config: ConfigService
    ) {}

    async listEccho(): Promise<ToolkitAdminEcchoResponseDto[]> {
        const { items } = this.ecchoCatalog.getToolkits({
            limit: ECCHO_TOOLKITS.length,
            offset: 0,
        });
        const usage = await this.toolRepository.countUsageByToolkit(
            ENUM_MCP_PROVIDER.ECCHO
        );
        return items.map(toolkit =>
            plainToInstance(
                ToolkitAdminEcchoResponseDto,
                {
                    ...this.toRow(toolkit, usage),
                    configured: !!ECCHO_TOOLKITS.find(
                        def => def.slug === toolkit.slug
                    )?.baseUrl,
                },
                { excludeExtraneousValues: true }
            )
        );
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

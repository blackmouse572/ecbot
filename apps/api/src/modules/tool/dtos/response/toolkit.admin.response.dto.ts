import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ToolkitAdminCategoryResponseDto {
    @ApiProperty({ example: 'ecommerce' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'E-commerce' })
    @Expose()
    name: string;
}

// One marketplace toolkit and how widely it is installed.
export class ToolkitAdminResponseDto {
    @ApiProperty({ example: 'kiotviet' })
    @Expose()
    slug: string;

    @ApiProperty({ example: 'KiotViet' })
    @Expose()
    name: string;

    @ApiPropertyOptional()
    @Expose()
    description?: string;

    @ApiPropertyOptional({ description: 'Logo URL' })
    @Expose()
    logo?: string;

    @ApiProperty({ type: [ToolkitAdminCategoryResponseDto] })
    @Expose()
    @Type(() => ToolkitAdminCategoryResponseDto)
    categories: ToolkitAdminCategoryResponseDto[];

    @ApiProperty({ description: 'Workspaces with a live tool from it' })
    @Expose()
    workspaceCount: number;

    @ApiProperty({ description: 'Live tools installed from it' })
    @Expose()
    toolCount: number;
}

export class ToolkitAdminEcchoResponseDto extends ToolkitAdminResponseDto {
    @ApiProperty({
        description: 'Whether the server URL for this toolkit is set',
    })
    @Expose()
    configured: boolean;
}

export class ToolkitAdminComposioStatusResponseDto {
    @ApiProperty({ description: 'COMPOSIO_API_KEY is set' })
    @Expose()
    apiKeyConfigured: boolean;

    @ApiProperty({ description: 'The catalog loaded with that key' })
    @Expose()
    reachable: boolean;

    @ApiProperty({ example: 'https://backend.composio.dev' })
    @Expose()
    baseUrl: string;

    @ApiProperty({ description: 'Toolkits in the Composio catalog' })
    @Expose()
    toolkitCount: number;

    @ApiProperty({ description: 'Toolkits with at least one live tool' })
    @Expose()
    installedToolkitCount: number;

    @ApiProperty({ description: 'Live Composio tools in all workspaces' })
    @Expose()
    toolCount: number;
}

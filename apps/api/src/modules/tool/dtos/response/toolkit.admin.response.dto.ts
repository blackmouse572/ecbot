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

    @ApiProperty({ description: 'Hidden from the workspace marketplace' })
    @Expose()
    disabled: boolean;

    @ApiProperty({ description: 'Created in admin, not defined in code' })
    @Expose()
    custom: boolean;
}

export class ToolkitAdminDefaultsResponseDto {
    @ApiProperty({
        description: 'Server URL from the environment, may be empty',
    })
    @Expose()
    serverUrl: string;

    @ApiProperty()
    @Expose()
    name: string;

    @ApiPropertyOptional()
    @Expose()
    description?: string;

    @ApiPropertyOptional()
    @Expose()
    logo?: string;

    @ApiProperty({ type: [ToolkitAdminCategoryResponseDto] })
    @Expose()
    @Type(() => ToolkitAdminCategoryResponseDto)
    categories: ToolkitAdminCategoryResponseDto[];
}

export class ToolkitAdminToolResponseDto {
    @ApiProperty()
    @Expose()
    id: string;

    @ApiProperty()
    @Expose()
    displayName: string;

    @ApiProperty()
    @Expose()
    status: string;

    @ApiProperty()
    @Expose()
    createdAt: Date;

    @ApiProperty({ description: 'Workspace that installed it' })
    @Expose()
    workspaceId: string;

    @ApiProperty()
    @Expose()
    workspaceName: string;
}

export class ToolkitAdminEcchoDetailResponseDto extends ToolkitAdminEcchoResponseDto {
    @ApiProperty({ description: 'Server URL new installs use, may be empty' })
    @Expose()
    serverUrl: string;

    @ApiProperty({
        description: 'Code defaults, what a reset brings back',
        type: ToolkitAdminDefaultsResponseDto,
    })
    @Expose()
    @Type(() => ToolkitAdminDefaultsResponseDto)
    defaults: ToolkitAdminDefaultsResponseDto;

    @ApiProperty({
        description: 'Fields an admin has changed',
        type: [String],
        example: ['name'],
    })
    @Expose()
    overriddenFields: string[];

    @ApiProperty({ type: [ToolkitAdminToolResponseDto] })
    @Expose()
    @Type(() => ToolkitAdminToolResponseDto)
    tools: ToolkitAdminToolResponseDto[];
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

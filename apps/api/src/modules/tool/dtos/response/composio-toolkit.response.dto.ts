import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ComposioToolkitCategoryDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;
}

export class ComposioToolkitResponseDto {
    @ApiProperty()
    slug: string;

    @ApiProperty()
    name: string;

    @ApiPropertyOptional()
    description?: string;

    @ApiPropertyOptional({ type: [ComposioToolkitCategoryDto] })
    categories?: ComposioToolkitCategoryDto[];

    @ApiPropertyOptional()
    logo?: string;
}

export class ComposioToolkitDetailMetaDto {
    @ApiProperty()
    created_at: string;

    @ApiProperty()
    updated_at: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    logo: string;

    @ApiProperty()
    app_url: string;

    @ApiProperty({ type: 'array' })
    categories: { name: string; slug: string }[];

    @ApiProperty()
    triggers_count: number;

    @ApiProperty()
    tools_count: number;

    @ApiProperty()
    version: string;

    @ApiProperty({ type: [String] })
    available_versions: string[];
}

export class ComposioToolkitDetailResponseDto {
    @ApiProperty()
    slug: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    enabled: boolean;

    @ApiProperty({ type: [String] })
    composio_managed_auth_schemes: string[];

    @ApiProperty()
    is_local_toolkit: boolean;

    @ApiProperty({ type: 'array' })
    auth_config_details: unknown[];

    @ApiPropertyOptional()
    auth_guide_url?: string;

    @ApiPropertyOptional()
    base_url?: string;

    @ApiProperty({ type: ComposioToolkitDetailMetaDto })
    meta: ComposioToolkitDetailMetaDto;
}

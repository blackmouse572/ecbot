import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class InstallMarketplaceRequestDto {
    @ApiProperty()
    @IsString()
    @MinLength(1)
    toolkitSlug!: string;

    @ApiPropertyOptional({
        description:
            'Human-readable name for the tool. Defaults to toolkitSlug.',
    })
    @IsOptional()
    @IsString()
    displayName?: string;

    @ApiProperty({
        description:
            'Frontend callback URL Composio should redirect to after OAuth',
    })
    @IsUrl({ require_tld: false })
    callbackUrl!: string;
}

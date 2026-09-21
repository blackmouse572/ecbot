import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, IsUUID } from 'class-validator';

export class ReauthMarketplaceRequestDto {
    @ApiProperty({
        description: 'ID of the existing PENDING_AUTH tool to re-authenticate',
    })
    @IsString()
    @IsUUID()
    toolId!: string;

    @ApiProperty({
        description:
            'Frontend callback URL Composio should redirect to after OAuth',
    })
    @IsUrl({ require_tld: false })
    callbackUrl!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ENUM_ACCOUNT_TYPE } from '../../enums/account.enum';

/** Channels that need the person to sign in on the platform in a browser. */
export const BROWSER_CONNECT_PLATFORMS = [
    ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT,
    ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
    ENUM_ACCOUNT_TYPE.ZALO_ACCOUNT,
    ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS,
    ENUM_ACCOUNT_TYPE.THREADS_ACCOUNT,
] as const;

export class AccountClientConnectLinkRequestDto {
    @ApiProperty({
        enum: BROWSER_CONNECT_PLATFORMS,
        description:
            'FACEBOOK_ACCOUNT connects the Facebook Pages of a login. The others connect one account each.',
    })
    @IsEnum(BROWSER_CONNECT_PLATFORMS)
    platform: (typeof BROWSER_CONNECT_PLATFORMS)[number];
}

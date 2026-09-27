import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ENUM_ACCOUNT_TYPE } from '../../enums/account.enum';

export const LINKABLE_PLATFORMS = [
    ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT,
    ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
    ENUM_ACCOUNT_TYPE.ZALO_ACCOUNT,
    ENUM_ACCOUNT_TYPE.TIKTOK_SHOP,
    ENUM_ACCOUNT_TYPE.SHOPEE_SHOP,
    ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
    ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS,
] as const;

export class AccountLinkRequestDto {
    @ApiProperty({
        example: 'Absconditus cenaculum absum sequi subvenio.',
    })
    @IsString()
    @IsNotEmpty()
    code: string;

    @ApiProperty({
        enum: LINKABLE_PLATFORMS,
        example: ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT,
    })
    @IsEnum(LINKABLE_PLATFORMS)
    @IsNotEmpty()
    platform: ENUM_ACCOUNT_TYPE;
}

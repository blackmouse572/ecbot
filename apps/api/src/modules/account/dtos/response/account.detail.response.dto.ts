import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { ENUM_ACCOUNT_TYPE } from '../../enums/account.enum';
import {
    ApiChannelConfig,
    WebsiteWidgetConfig,
} from '../../interfaces/account-config.interface';
import { AccountEntity } from '../../repository/entities/account.entity';
import { AccountGetResponseDto } from './account.get.response.dto';

/**
 * `config` is a union discriminated by `type`. Read it only for the channel
 * kind that owns the key, so a widget never surfaces an API-channel field.
 */
function configOf<T>(account: AccountEntity, type: ENUM_ACCOUNT_TYPE): T {
    return account.type === type ? (account.config as T) : undefined;
}

export class AccountGetDetailResponseDto extends AccountGetResponseDto {
    @ApiPropertyOptional({
        description:
            'Platform-facing account key — identifies this channel in the `accountKey` field of an inbound message. Only present for eccho-issued channels (API_CHANNEL, WEBSITE_WIDGET).',
        example: '2c3f0b6e-3a1d-4a2c-9f9d-2a1e5c7b41aa',
    })
    @Expose({ name: 'externalId' })
    accountKey?: string;

    @ApiPropertyOptional({
        description: 'Where bot replies are POSTed. API_CHANNEL only.',
        example: 'https://partner.example.com/eccho/replies',
    })
    @Expose()
    @Transform(
        ({ obj }: { obj: AccountEntity }) =>
            configOf<ApiChannelConfig>(obj, ENUM_ACCOUNT_TYPE.API_CHANNEL)
                ?.callbackUrl
    )
    callbackUrl?: string;

    @ApiPropertyOptional({
        description:
            'Origins allowed to embed the widget. WEBSITE_WIDGET only.',
        example: ['https://shop.example.com'],
        isArray: true,
        type: String,
    })
    @Expose()
    @Transform(
        ({ obj }: { obj: AccountEntity }) =>
            configOf<WebsiteWidgetConfig>(obj, ENUM_ACCOUNT_TYPE.WEBSITE_WIDGET)
                ?.allowedOrigins
    )
    allowedOrigins?: string[];
}

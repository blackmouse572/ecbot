import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ENUM_MARKETING_AUDIENCE_EXCLUSION } from '../../enums/marketing-audience.enum';

export class MarketingAudienceExclusionDto {
    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_AUDIENCE_EXCLUSION })
    reason: ENUM_MARKETING_AUDIENCE_EXCLUSION;

    @Expose()
    @ApiProperty({ example: 6 })
    count: number;
}

export class MarketingAudienceExcludedDto {
    @Expose()
    @ApiProperty({ example: 6, description: 'Matching customers left out' })
    total: number;

    @Expose()
    @Type(() => MarketingAudienceExclusionDto)
    @ApiProperty({
        type: [MarketingAudienceExclusionDto],
        description:
            'Every reason, in order; a customer counts under the first that applies',
    })
    reasons: MarketingAudienceExclusionDto[];
}

export class MarketingAudienceChannelDto {
    @Expose()
    @ApiProperty({ enum: ENUM_ACCOUNT_TYPE })
    platform: ENUM_ACCOUNT_TYPE;

    @Expose()
    @ApiProperty({ example: 40 })
    count: number;
}

export class MarketingAudiencePreviewResponseDto {
    @Expose()
    @ApiProperty({ example: 48, description: 'Customers the audience reaches' })
    count: number;

    @Expose()
    @Type(() => MarketingAudienceExcludedDto)
    @ApiProperty({ type: MarketingAudienceExcludedDto })
    excluded: MarketingAudienceExcludedDto;

    @Expose()
    @Type(() => MarketingAudienceChannelDto)
    @ApiProperty({
        type: [MarketingAudienceChannelDto],
        description:
            'Reached customers per channel they have a contact point on; one customer can count on several',
    })
    channels: MarketingAudienceChannelDto[];
}

import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class AnalyticsTagCountDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiPropertyOptional()
    emoji?: string;

    @Expose()
    @ApiProperty()
    count: number;
}

export class AnalyticsCustomerDayDto {
    @Expose()
    @ApiProperty({ example: '2026-10-16' })
    day: string;

    @Expose()
    @ApiProperty()
    newCustomers: number;

    @Expose()
    @ApiProperty({ description: 'Earlier customers who wrote that day' })
    returning: number;
}

export class AnalyticsChannelCountDto {
    @Expose()
    @ApiProperty({ enum: ENUM_ACCOUNT_TYPE })
    platform: ENUM_ACCOUNT_TYPE;

    @Expose()
    @ApiProperty()
    count: number;
}

export class AnalyticsCustomersResponseDto {
    @Expose()
    @ApiProperty()
    generatedAt: string;

    @Expose()
    @ApiProperty({ type: [AnalyticsTagCountDto] })
    @Type(() => AnalyticsTagCountDto)
    tags: AnalyticsTagCountDto[];

    @Expose()
    @ApiProperty()
    total: number;

    @Expose()
    @ApiProperty()
    untagged: number;

    @Expose()
    @ApiProperty({ type: [AnalyticsCustomerDayDto] })
    @Type(() => AnalyticsCustomerDayDto)
    daily: AnalyticsCustomerDayDto[];

    @Expose()
    @ApiProperty({ type: [AnalyticsChannelCountDto] })
    @Type(() => AnalyticsChannelCountDto)
    byChannel: AnalyticsChannelCountDto[];
}

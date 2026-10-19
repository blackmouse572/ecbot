import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AnalyticsPeriodValueDto } from './analytics.period-value.response.dto';

export class AnalyticsConversionDayDto {
    @Expose()
    @ApiProperty({ example: '2026-10-16' })
    day: string;

    @Expose()
    @ApiProperty()
    newCustomers: number;

    @Expose()
    @ApiProperty()
    orders: number;
}

export class AnalyticsConversionChannelDto {
    @Expose()
    @ApiProperty({ enum: ENUM_ACCOUNT_TYPE })
    platform: ENUM_ACCOUNT_TYPE;

    @Expose()
    @ApiProperty({ description: 'Customers first seen in the period' })
    newCustomers: number;

    @Expose()
    @ApiProperty({
        description: 'New customers who sent at least two messages',
    })
    engaged: number;

    @Expose()
    @ApiProperty({ description: 'New customers tagged as a hot lead' })
    hotLeads: number;

    @Expose()
    @ApiProperty({ description: 'New customers tagged with an order' })
    orders: number;
}

export class AnalyticsConversionResponseDto {
    @Expose()
    @ApiProperty()
    generatedAt: string;

    @Expose()
    @ApiProperty({
        type: AnalyticsPeriodValueDto,
        description: 'Percent of new customers who placed an order',
    })
    @Type(() => AnalyticsPeriodValueDto)
    conversionRate: AnalyticsPeriodValueDto;

    @Expose()
    @ApiProperty({ type: [AnalyticsConversionDayDto] })
    @Type(() => AnalyticsConversionDayDto)
    daily: AnalyticsConversionDayDto[];

    @Expose()
    @ApiProperty({ type: [AnalyticsConversionChannelDto] })
    @Type(() => AnalyticsConversionChannelDto)
    byChannel: AnalyticsConversionChannelDto[];

    @Expose()
    @ApiProperty({
        description: 'Median hours from first contact to the first order',
    })
    medianHoursToOrder: number;
}

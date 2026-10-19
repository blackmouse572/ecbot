import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AnalyticsPeriodValueDto } from './analytics.period-value.response.dto';

export class AnalyticsSentimentDayDto {
    @Expose()
    @ApiProperty({ example: '2026-10-16' })
    day: string;

    @Expose()
    @ApiProperty()
    positive: number;

    @Expose()
    @ApiProperty({ description: 'Negative, angry included' })
    negative: number;

    @Expose()
    @ApiProperty()
    complaint: number;
}

export class AnalyticsSentimentChannelDto {
    @Expose()
    @ApiProperty({ enum: ENUM_ACCOUNT_TYPE })
    platform: ENUM_ACCOUNT_TYPE;

    @Expose()
    @ApiProperty({ description: 'Conversations with a customer message' })
    conversations: number;

    @Expose()
    @ApiProperty({
        description: 'Percent of those conversations tagged positive',
    })
    positive: number;

    @Expose()
    @ApiProperty({ description: 'Percent tagged negative or angry' })
    negative: number;
}

export class AnalyticsUnhappyCustomerDto {
    @Expose()
    @ApiProperty()
    customerId: string;

    @Expose()
    @ApiPropertyOptional()
    conversationId?: string;

    @Expose()
    @ApiPropertyOptional()
    name?: string;

    @Expose()
    @ApiPropertyOptional({ enum: ENUM_ACCOUNT_TYPE })
    platform?: ENUM_ACCOUNT_TYPE;

    @Expose()
    @ApiProperty()
    tagName: string;

    @Expose()
    @ApiPropertyOptional()
    emoji?: string;

    @Expose()
    @ApiProperty()
    at: string;
}

export class AnalyticsMarketingResponseDto {
    @Expose()
    @ApiProperty()
    generatedAt: string;

    @Expose()
    @ApiProperty({
        type: AnalyticsPeriodValueDto,
        description: 'Percent of classified conversations that were positive',
    })
    @Type(() => AnalyticsPeriodValueDto)
    positiveRate: AnalyticsPeriodValueDto;

    @Expose()
    @ApiProperty({ type: [AnalyticsSentimentDayDto] })
    @Type(() => AnalyticsSentimentDayDto)
    daily: AnalyticsSentimentDayDto[];

    @Expose()
    @ApiProperty({ type: [AnalyticsSentimentChannelDto] })
    @Type(() => AnalyticsSentimentChannelDto)
    byChannel: AnalyticsSentimentChannelDto[];

    @Expose()
    @ApiProperty({ type: [AnalyticsUnhappyCustomerDto] })
    @Type(() => AnalyticsUnhappyCustomerDto)
    unhappy: AnalyticsUnhappyCustomerDto[];
}

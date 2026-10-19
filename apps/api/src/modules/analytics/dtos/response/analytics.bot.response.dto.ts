import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AnalyticsPeriodValueDto } from './analytics.period-value.response.dto';

export class AnalyticsBotDayDto {
    @Expose()
    @ApiProperty({ example: '2026-10-16' })
    day: string;

    @Expose()
    @ApiProperty()
    botResolved: number;

    @Expose()
    @ApiProperty()
    handedOver: number;
}

export class AnalyticsHandoffReasonDto {
    @Expose()
    @ApiProperty({
        description:
            'The tag id for a tag rule, else fallback_threshold, keyword_trigger, tag_trigger or other',
    })
    key: string;

    @Expose()
    @ApiPropertyOptional()
    tagName?: string;

    @Expose()
    @ApiPropertyOptional()
    emoji?: string;

    @Expose()
    @ApiProperty()
    count: number;
}

export class AnalyticsBotChatbotDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty()
    conversations: number;

    @Expose()
    @ApiProperty()
    botResolvedRate: number;

    @Expose()
    @ApiProperty()
    handoffRate: number;

    @Expose()
    @ApiProperty({ description: 'Median seconds to the first bot reply' })
    firstReplySeconds: number;

    @Expose()
    @ApiProperty()
    toolErrorRate: number;
}

export class AnalyticsBotResponseDto {
    @Expose()
    @ApiProperty()
    generatedAt: string;

    @Expose()
    @ApiProperty({
        type: AnalyticsPeriodValueDto,
        description: 'Percent of conversations handed over to staff',
    })
    @Type(() => AnalyticsPeriodValueDto)
    handoffRate: AnalyticsPeriodValueDto;

    @Expose()
    @ApiProperty({ type: [AnalyticsBotDayDto] })
    @Type(() => AnalyticsBotDayDto)
    daily: AnalyticsBotDayDto[];

    @Expose()
    @ApiProperty({ type: [AnalyticsHandoffReasonDto] })
    @Type(() => AnalyticsHandoffReasonDto)
    reasons: AnalyticsHandoffReasonDto[];

    @Expose()
    @ApiProperty({ type: [AnalyticsBotChatbotDto] })
    @Type(() => AnalyticsBotChatbotDto)
    byChatbot: AnalyticsBotChatbotDto[];
}

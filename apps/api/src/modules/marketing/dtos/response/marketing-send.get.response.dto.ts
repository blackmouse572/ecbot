import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import {
    ENUM_MARKETING_AUDIENCE_EXCLUSION,
    ENUM_MARKETING_AUDIENCE_MATCH,
} from '../../enums/marketing-audience.enum';
import { ENUM_MARKETING_TODO } from '../../enums/marketing-overview.enum';
import {
    ENUM_MARKETING_REPLY_STATUS,
    ENUM_MARKETING_SEND_MODE,
    ENUM_MARKETING_SKIP_REASON,
} from '../../enums/marketing-send.enum';
import { MarketingAudienceConditionResponseDto } from './marketing-audience-condition.response.dto';

export class MarketingSendStatsDto {
    @Expose()
    @ApiProperty({ description: 'Waiting to go out' })
    queued: number;

    @Expose()
    @ApiProperty()
    sent: number;

    @Expose()
    @ApiProperty()
    failed: number;

    @Expose()
    @ApiProperty({ description: 'Not sent at send time, see notSent' })
    skipped: number;

    @Expose()
    @ApiProperty({ description: 'Sent offers answered within 72 hours' })
    replied: number;

    @Expose()
    @ApiProperty({ description: 'Customers who ordered within 7 days' })
    ordered: number;

    @Expose()
    @ApiProperty({ description: "Those orders' total, in minor units" })
    revenue: number;

    @Expose()
    @ApiProperty({ description: 'Customers who opted out after their offer' })
    optedOut: number;

    @Expose()
    @ApiProperty({ nullable: true, type: Date })
    lastSentAt: Date | null;
}

export class MarketingSendListResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_SEND_MODE })
    mode: ENUM_MARKETING_SEND_MODE;

    @Expose()
    @ApiProperty({ description: 'AUTO: false once turned off' })
    active: boolean;

    @Expose()
    @ApiProperty({ description: 'May hold {name} and {product}' })
    text: string;

    @Expose()
    @ApiProperty({ nullable: true, type: String })
    imageUrl: string | null;

    @Expose()
    @ApiPropertyOptional({ enum: ENUM_MARKETING_TODO })
    preset?: ENUM_MARKETING_TODO;

    @Expose()
    @ApiPropertyOptional({ enum: ENUM_MARKETING_AUDIENCE_MATCH })
    match?: ENUM_MARKETING_AUDIENCE_MATCH;

    @Expose()
    @ApiPropertyOptional({ type: [MarketingAudienceConditionResponseDto] })
    @Type(() => MarketingAudienceConditionResponseDto)
    conditions?: MarketingAudienceConditionResponseDto[];

    @Expose()
    @ApiProperty({ type: MarketingSendStatsDto })
    @Type(() => MarketingSendStatsDto)
    stats: MarketingSendStatsDto;

    @Expose()
    @ApiProperty()
    createdAt: Date;
}

export class MarketingSendChannelDto {
    @Expose()
    @ApiProperty({ enum: ENUM_ACCOUNT_TYPE })
    channel: ENUM_ACCOUNT_TYPE;

    @Expose()
    @ApiProperty()
    sent: number;

    @Expose()
    @ApiProperty()
    replied: number;

    @Expose()
    @ApiProperty()
    ordered: number;

    @Expose()
    @ApiProperty()
    optedOut: number;
}

export class MarketingSendNotSentDto {
    @Expose()
    @ApiProperty({
        enum: [
            ...new Set<string>([
                ...Object.values(ENUM_MARKETING_AUDIENCE_EXCLUSION),
                ...Object.values(ENUM_MARKETING_SKIP_REASON),
            ]),
        ],
        description:
            'Left out when the send started (CAPPED, RESTING, ...), or skipped at send time (WINDOW_CLOSED, ...)',
    })
    reason: ENUM_MARKETING_AUDIENCE_EXCLUSION | ENUM_MARKETING_SKIP_REASON;

    @Expose()
    @ApiProperty()
    count: number;
}

export class MarketingSendGetResponseDto extends MarketingSendListResponseDto {
    @Expose()
    @ApiProperty({ type: [MarketingSendChannelDto] })
    @Type(() => MarketingSendChannelDto)
    channels: MarketingSendChannelDto[];

    @Expose()
    @ApiProperty({
        type: [MarketingSendNotSentDto],
        description: 'Không gửi được',
    })
    @Type(() => MarketingSendNotSentDto)
    notSent: MarketingSendNotSentDto[];
}

export class MarketingSendReplyResponseDto {
    @Expose()
    @ApiProperty()
    customerId: string;

    @Expose()
    @ApiProperty({ nullable: true, type: String })
    name: string | null;

    @Expose()
    @ApiProperty({ nullable: true, type: String })
    conversationId: string | null;

    @Expose()
    @ApiProperty({
        nullable: true,
        type: String,
        description: 'Their first message after the offer',
    })
    text: string | null;

    @Expose()
    @ApiProperty()
    repliedAt: Date;

    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_REPLY_STATUS })
    status: ENUM_MARKETING_REPLY_STATUS;
}

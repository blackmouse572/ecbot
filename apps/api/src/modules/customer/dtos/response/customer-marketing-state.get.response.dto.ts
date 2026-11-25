import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CustomerMarketingFirstSourceResponseDto } from './customer-marketing-first-source.response.dto';
import { CustomerMarketingFreeWindowResponseDto } from './customer-marketing-free-window.response.dto';
import { CustomerProductReactionGetResponseDto } from './customer-product-reaction.get.response.dto';
import { CustomerMarketingSummaryResponseDto } from './customer-marketing-summary.response.dto';
import { MarketingEventGetResponseDto } from './marketing-event.get.response.dto';

export class CustomerMarketingStateGetResponseDto extends CustomerMarketingSummaryResponseDto {
    @Expose()
    @ApiProperty({ type: Date, required: false, nullable: true })
    consentAskedAt?: Date | null;

    @Expose()
    @Type(() => CustomerMarketingFirstSourceResponseDto)
    @ApiProperty({
        type: CustomerMarketingFirstSourceResponseDto,
        isArray: true,
        description:
            'Every tracked link the customer arrived through, with the first time, oldest first.',
    })
    sources: CustomerMarketingFirstSourceResponseDto[];

    @Expose()
    @ApiProperty({ type: Date, required: false, nullable: true })
    lastInboundAt?: Date | null;

    @Expose()
    @Type(() => MarketingEventGetResponseDto)
    @ApiProperty({
        type: MarketingEventGetResponseDto,
        nullable: true,
        description: 'The latest stage change: why the customer is here.',
    })
    stageEvent: MarketingEventGetResponseDto | null;

    @Expose()
    @Type(() => MarketingEventGetResponseDto)
    @ApiProperty({
        type: MarketingEventGetResponseDto,
        nullable: true,
        description: 'The latest permission change.',
    })
    permissionEvent: MarketingEventGetResponseDto | null;

    @Expose()
    @Type(() => MarketingEventGetResponseDto)
    @ApiProperty({
        type: MarketingEventGetResponseDto,
        nullable: true,
        description:
            'Why the customer is Khó chịu; null while the flag is off.',
    })
    hostileEvent: MarketingEventGetResponseDto | null;

    @Expose()
    @Type(() => CustomerMarketingFreeWindowResponseDto)
    @ApiProperty({
        type: [CustomerMarketingFreeWindowResponseDto],
        description:
            'Free-message window on each channel with a free route, most recent first.',
    })
    freeWindows: CustomerMarketingFreeWindowResponseDto[];

    @Expose()
    @Type(() => CustomerProductReactionGetResponseDto)
    @ApiProperty({
        type: [CustomerProductReactionGetResponseDto],
        description:
            'Với nhóm hàng: the active "Tạm hoãn" per product group, soonest end first.',
    })
    reactions: CustomerProductReactionGetResponseDto[];
}

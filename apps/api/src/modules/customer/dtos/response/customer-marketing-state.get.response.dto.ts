import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CustomerMarketingFreeWindowResponseDto } from './customer-marketing-free-window.response.dto';
import { CustomerMarketingSummaryResponseDto } from './customer-marketing-summary.response.dto';
import { MarketingEventGetResponseDto } from './marketing-event.get.response.dto';

export class CustomerMarketingStateGetResponseDto extends CustomerMarketingSummaryResponseDto {
    @Expose()
    @ApiProperty({ required: false, nullable: true })
    consentAskedAt?: Date | null;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
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
}

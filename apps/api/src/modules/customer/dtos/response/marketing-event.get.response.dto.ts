import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { CustomerMarketingFirstSourceResponseDto } from './customer-marketing-first-source.response.dto';
import {
    ENUM_MARKETING_EVENT_ACTOR,
    ENUM_MARKETING_EVENT_KIND,
} from '../../enums/customer-marketing.enum';

export class MarketingEventGetResponseDto extends DatabaseDto {
    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_EVENT_KIND })
    kind: ENUM_MARKETING_EVENT_KIND;

    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_EVENT_ACTOR })
    actor: ENUM_MARKETING_EVENT_ACTOR;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    oldValue?: string | null;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    newValue?: string | null;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    reason?: string | null;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    conversationId?: string | null;

    @Expose()
    @ApiProperty({ type: String, required: false, nullable: true })
    messageId?: string | null;

    @Expose()
    @ApiProperty({
        required: false,
        nullable: true,
        description: 'The confirmed order behind a Mua 1 lần / Mua nhiều lần.',
    })
    orderId?: string | null;

    @Expose()
    @ApiProperty({
        required: false,
        nullable: true,
        description: 'The product group of a REACTION or INTENT event.',
    })
    productGroupId?: string | null;

    @Expose()
    @Type(() => CustomerMarketingFirstSourceResponseDto)
    @ApiProperty({
        type: CustomerMarketingFirstSourceResponseDto,
        required: false,
        nullable: true,
        description:
            'SOURCE events: the tracked link the customer arrived through. Null when the link was deleted.',
    })
    source?: CustomerMarketingFirstSourceResponseDto | null;
}

import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
} from '../../enums/customer-marketing.enum';

/** A Customer's marketing labels, as a list row shows them. */
export class CustomerMarketingSummaryResponseDto {
    @Expose()
    @ApiProperty({ enum: ENUM_CUSTOMER_JOURNEY_STAGE })
    stage: ENUM_CUSTOMER_JOURNEY_STAGE;

    @Expose()
    @ApiProperty({ enum: ENUM_CUSTOMER_MARKETING_PERMISSION })
    permission: ENUM_CUSTOMER_MARKETING_PERMISSION;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    permissionUntil?: Date | null;

    @Expose()
    @ApiProperty({ description: 'The "Khó chịu" flag.' })
    hostile: boolean;

    @Expose()
    @ApiProperty({ description: 'Ngủ đông: no message for 120 days.' })
    dormant: boolean;
}

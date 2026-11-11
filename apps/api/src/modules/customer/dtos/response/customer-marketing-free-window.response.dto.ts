import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** How long the shop may still message the Customer for free on a channel. */
export class CustomerMarketingFreeWindowResponseDto {
    @Expose()
    @ApiProperty({ enum: ENUM_ACCOUNT_TYPE })
    channel: ENUM_ACCOUNT_TYPE;

    @Expose()
    @ApiProperty({ description: "The customer's last message on it." })
    lastInboundAt: Date;

    @Expose()
    @ApiProperty({
        type: Date,
        nullable: true,
        description:
            'Free messages are allowed until then; past means closed. Null: no limit (Telegram).',
    })
    openUntil: Date | null;
}

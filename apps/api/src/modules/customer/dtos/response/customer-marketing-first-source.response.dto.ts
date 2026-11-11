import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/** Nguồn đầu tiên: the tracked link a Customer first arrived through. */
export class CustomerMarketingFirstSourceResponseDto {
    @Expose()
    @ApiProperty({ description: 'The source (a top-level tracked link).' })
    sourceId: string;

    @Expose()
    @ApiProperty()
    sourceName: string;

    @Expose()
    @ApiProperty({
        type: String,
        nullable: true,
        description:
            'The QR, KOL or other code of the source they used; null when they used the source link itself.',
    })
    codeName: string | null;

    @Expose()
    @ApiProperty({ enum: ENUM_ACCOUNT_TYPE })
    channel: ENUM_ACCOUNT_TYPE;

    @Expose()
    @ApiProperty({ description: 'When they first arrived through it.' })
    at: Date;
}

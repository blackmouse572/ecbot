import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class TrackedLinkAccountResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiProperty({ enum: ENUM_ACCOUNT_TYPE })
    type: ENUM_ACCOUNT_TYPE;
}

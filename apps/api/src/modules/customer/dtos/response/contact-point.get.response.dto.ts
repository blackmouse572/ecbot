import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ContactPointGetResponseDto extends DatabaseDto {
    @Expose()
    @ApiProperty({ enum: ENUM_ACCOUNT_TYPE })
    platform: ENUM_ACCOUNT_TYPE;

    @Expose()
    @ApiProperty()
    externalSenderId: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    displaySenderName?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    senderAvatar?: string;

    @Expose()
    @ApiProperty({ required: false, nullable: true })
    fetchedAt?: Date;
}

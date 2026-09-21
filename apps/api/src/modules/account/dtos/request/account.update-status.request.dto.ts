import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ENUM_ACCOUNT_STATUS } from '../../enums/account.enum';

export class AccountUpdateStatusRequestDto {
    @ApiProperty({
        required: true,
        enum: ENUM_ACCOUNT_STATUS,
        default: ENUM_ACCOUNT_STATUS.ACTIVE,
    })
    @IsString()
    @IsEnum(ENUM_ACCOUNT_STATUS)
    @IsNotEmpty()
    status: ENUM_ACCOUNT_STATUS;
}

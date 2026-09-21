import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import {
    IsDate,
    IsDefined,
    IsEnum,
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsString,
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { SmsSendRequestDto } from 'src/modules/sms/dtos/request/sms.send.request.dto';
import { ENUM_SEND_SMS_PROCESS } from 'src/modules/sms/enums/sms.enum';

export class SmsVerificationTaskDataDto {
    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    @MaxLength(6)
    otp: string;

    @ApiProperty({ required: true, type: Date })
    @IsDefined()
    @Type(() => Date)
    @IsDate()
    expiredAt: Date;
}

export class SmsTaskDto {
    @ApiProperty({ enum: ENUM_SEND_SMS_PROCESS, required: true })
    @IsDefined()
    @IsEnum(ENUM_SEND_SMS_PROCESS)
    jobName: ENUM_SEND_SMS_PROCESS;

    @ApiProperty({ required: true, type: SmsSendRequestDto })
    @IsDefined()
    @IsObject()
    @IsNotEmpty()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => SmsSendRequestDto)
    send: SmsSendRequestDto;

    @ApiProperty({ required: true, type: SmsVerificationTaskDataDto })
    @IsDefined()
    @IsObject()
    @IsNotEmpty()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => SmsVerificationTaskDataDto)
    data: SmsVerificationTaskDataDto;
}

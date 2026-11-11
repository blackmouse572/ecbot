import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsDate,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE,
    ENUM_CUSTOMER_MARKETING_PERMISSION,
} from '../../enums/customer-marketing.enum';

/** An operator's change to a Customer's marketing labels; the reason is kept. */
export class CustomerMarketingStateUpdateRequestDto {
    @IsOptional()
    @IsEnum(ENUM_CUSTOMER_JOURNEY_STAGE)
    @ApiProperty({ enum: ENUM_CUSTOMER_JOURNEY_STAGE, required: false })
    stage?: ENUM_CUSTOMER_JOURNEY_STAGE;

    @IsOptional()
    @IsEnum(ENUM_CUSTOMER_MARKETING_PERMISSION)
    @ApiProperty({ enum: ENUM_CUSTOMER_MARKETING_PERMISSION, required: false })
    permission?: ENUM_CUSTOMER_MARKETING_PERMISSION;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    @ApiProperty({
        required: false,
        description: 'Required with PAUSED: offers may resume after it.',
    })
    permissionUntil?: Date;

    @IsOptional()
    @IsBoolean()
    @ApiProperty({ required: false, description: 'The "Khó chịu" flag.' })
    hostile?: boolean;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    @ApiProperty()
    reason: string;
}

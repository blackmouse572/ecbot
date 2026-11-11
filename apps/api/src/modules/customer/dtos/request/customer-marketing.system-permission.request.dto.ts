import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
} from 'class-validator';
import { ENUM_CUSTOMER_MARKETING_AGENT_ACTION } from '../../enums/customer-marketing.enum';

/** Body of the agent's `set_marketing_permission` tool. */
export class CustomerMarketingSystemPermissionRequestDto {
    @IsEnum(ENUM_CUSTOMER_MARKETING_AGENT_ACTION)
    @ApiProperty({ enum: ENUM_CUSTOMER_MARKETING_AGENT_ACTION })
    action: ENUM_CUSTOMER_MARKETING_AGENT_ACTION;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    @ApiProperty()
    reason: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(365)
    @ApiProperty({ required: false, description: 'With PAUSED; default 30.' })
    pauseDays?: number;

    @IsOptional()
    @IsString()
    @ApiProperty({ required: false, nullable: true })
    conversationId?: string | null;
}

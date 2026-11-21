import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    IsArray,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { MARKETING_AUDIENCE_MAX_VALUES } from '../../constants/marketing-audience.constant';
import {
    ENUM_MARKETING_AUDIENCE_FIELD,
    ENUM_MARKETING_AUDIENCE_OPERATOR,
} from '../../enums/marketing-audience.enum';

export class MarketingAudienceConditionRequestDto {
    @ApiProperty({
        enum: ENUM_MARKETING_AUDIENCE_FIELD,
        example: ENUM_MARKETING_AUDIENCE_FIELD.STAGE,
    })
    @IsEnum(ENUM_MARKETING_AUDIENCE_FIELD)
    field: ENUM_MARKETING_AUDIENCE_FIELD;

    @ApiProperty({
        enum: ENUM_MARKETING_AUDIENCE_OPERATOR,
        example: ENUM_MARKETING_AUDIENCE_OPERATOR.IN,
        description:
            'STAGE, LABEL, CHANNEL: IN / NOT_IN. PRODUCT_GROUP_ASKED, PRODUCT_GROUP_BOUGHT: IN. LAST_MESSAGE: WITHIN_DAYS / OLDER_THAN_DAYS. ORDERED_AFTER_PRICE: YES / NO. ORDER_COUNT, TOTAL_SPEND: AT_LEAST / AT_MOST.',
    })
    @IsEnum(ENUM_MARKETING_AUDIENCE_OPERATOR)
    operator: ENUM_MARKETING_AUDIENCE_OPERATOR;

    @ApiPropertyOptional({
        type: [String],
        example: ['ASKED_PRICE'],
        description:
            'For IN / NOT_IN: stages, product group ids, label ids or channel types',
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MARKETING_AUDIENCE_MAX_VALUES)
    @IsString({ each: true })
    @MaxLength(64, { each: true })
    values?: string[];

    @ApiPropertyOptional({
        example: 7,
        description:
            'Days for LAST_MESSAGE, a count for ORDER_COUNT, an amount in minor units for TOTAL_SPEND',
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    number?: number;
}

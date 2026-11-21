import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import {
    ENUM_MARKETING_AUDIENCE_FIELD,
    ENUM_MARKETING_AUDIENCE_OPERATOR,
} from '../../enums/marketing-audience.enum';

export class MarketingAudienceConditionResponseDto {
    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_AUDIENCE_FIELD })
    field: ENUM_MARKETING_AUDIENCE_FIELD;

    @Expose()
    @ApiProperty({ enum: ENUM_MARKETING_AUDIENCE_OPERATOR })
    operator: ENUM_MARKETING_AUDIENCE_OPERATOR;

    @Expose()
    @ApiPropertyOptional({ type: [String] })
    values?: string[];

    @Expose()
    @ApiPropertyOptional()
    number?: number;
}

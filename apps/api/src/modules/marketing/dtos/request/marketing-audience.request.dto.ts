import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsEnum,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { MARKETING_AUDIENCE_MAX_CONDITIONS } from '../../constants/marketing-audience.constant';
import { ENUM_MARKETING_AUDIENCE_MATCH } from '../../enums/marketing-audience.enum';
import { ENUM_MARKETING_TODO } from '../../enums/marketing-overview.enum';
import { MarketingAudienceConditionRequestDto } from './marketing-audience-condition.request.dto';

/** Either a "Việc nên làm" preset or conditions, never both. */
export class MarketingAudienceRequestDto {
    @ApiPropertyOptional({
        enum: ENUM_MARKETING_TODO,
        description: 'A Tổng quan "Việc nên làm" row; leave out conditions',
    })
    @IsOptional()
    @IsEnum(ENUM_MARKETING_TODO)
    preset?: ENUM_MARKETING_TODO;

    @ApiPropertyOptional({
        enum: ENUM_MARKETING_AUDIENCE_MATCH,
        default: ENUM_MARKETING_AUDIENCE_MATCH.ALL,
        description: 'Khách khớp Tất cả (ALL) or Bất kỳ (ANY) điều kiện',
    })
    @IsOptional()
    @IsEnum(ENUM_MARKETING_AUDIENCE_MATCH)
    match?: ENUM_MARKETING_AUDIENCE_MATCH;

    @ApiPropertyOptional({ type: [MarketingAudienceConditionRequestDto] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MARKETING_AUDIENCE_MAX_CONDITIONS)
    @ValidateNested({ each: true })
    @Type(() => MarketingAudienceConditionRequestDto)
    conditions?: MarketingAudienceConditionRequestDto[];
}

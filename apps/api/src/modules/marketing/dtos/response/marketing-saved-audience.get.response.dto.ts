import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ENUM_MARKETING_AUDIENCE_MATCH } from '../../enums/marketing-audience.enum';
import { ENUM_MARKETING_TODO } from '../../enums/marketing-overview.enum';
import { MarketingAudienceConditionResponseDto } from './marketing-audience-condition.response.dto';

export class MarketingSavedAudienceGetResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;

    @Expose()
    @ApiPropertyOptional({ enum: ENUM_MARKETING_TODO })
    preset?: ENUM_MARKETING_TODO;

    @Expose()
    @ApiPropertyOptional({ enum: ENUM_MARKETING_AUDIENCE_MATCH })
    match?: ENUM_MARKETING_AUDIENCE_MATCH;

    @Expose()
    @ApiPropertyOptional({ type: [MarketingAudienceConditionResponseDto] })
    @Type(() => MarketingAudienceConditionResponseDto)
    conditions?: MarketingAudienceConditionResponseDto[];

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiPropertyOptional()
    updatedAt?: Date;
}

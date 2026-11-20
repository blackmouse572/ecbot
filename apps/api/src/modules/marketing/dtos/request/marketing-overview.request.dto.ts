import { ENUM_ANALYTICS_RANGE } from '@app/modules/analytics/constants/analytics.constant';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

export class MarketingOverviewRequestDto {
    @ApiPropertyOptional({
        enum: ENUM_ANALYTICS_RANGE,
        default: ENUM_ANALYTICS_RANGE.DAYS_7,
        description:
            'Range the stage comparison, moves and opt-outs cover; Việc nên làm stays weekly',
    })
    @IsOptional()
    @IsEnum(ENUM_ANALYTICS_RANGE)
    range: ENUM_ANALYTICS_RANGE = ENUM_ANALYTICS_RANGE.DAYS_7;
}

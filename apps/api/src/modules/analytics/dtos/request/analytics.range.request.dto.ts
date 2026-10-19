import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsTimeZone } from 'class-validator';
import {
    ANALYTICS_DEFAULT_TIMEZONE,
    ENUM_ANALYTICS_RANGE,
} from '../../constants/analytics.constant';

export class AnalyticsRangeRequestDto {
    @ApiPropertyOptional({
        enum: ENUM_ANALYTICS_RANGE,
        default: ENUM_ANALYTICS_RANGE.DAYS_30,
    })
    @IsOptional()
    @IsEnum(ENUM_ANALYTICS_RANGE)
    range: ENUM_ANALYTICS_RANGE = ENUM_ANALYTICS_RANGE.DAYS_30;

    @ApiPropertyOptional({
        description: 'IANA timezone for day boundaries',
        default: ANALYTICS_DEFAULT_TIMEZONE,
        example: 'Asia/Ho_Chi_Minh',
    })
    @IsOptional()
    @IsTimeZone()
    timezone: string = ANALYTICS_DEFAULT_TIMEZONE;
}

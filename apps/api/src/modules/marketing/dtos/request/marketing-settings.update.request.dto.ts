import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Matches,
    Max,
    MaxLength,
    Min,
    ValidateIf,
} from 'class-validator';
import {
    MARKETING_SETTINGS_MAX_PER_30_DAYS,
    MARKETING_SETTINGS_MAX_REST_AFTER,
    MARKETING_SETTINGS_MAX_REST_DAYS,
    MARKETING_SETTINGS_MAX_STOP_KEYWORDS,
    MARKETING_SETTINGS_MAX_STOP_KEYWORD_LENGTH,
    MARKETING_SETTINGS_MAX_STOP_REPLY_LENGTH,
    MARKETING_SETTINGS_TIME_PATTERN,
} from '../../constants/marketing-send.constant';

// Left out keeps the saved value. Only the stop keywords and reply take
// null, which goes back to the built-in ones; the rest cannot be cleared.
const given = (_: unknown, value: unknown) => value !== undefined;

export class MarketingSettingsUpdateRequestDto {
    @ApiPropertyOptional({
        example: 3,
        description: 'Offers per customer in any 30 days.',
    })
    @ValidateIf(given)
    @IsInt()
    @Min(1)
    @Max(MARKETING_SETTINGS_MAX_PER_30_DAYS)
    maxPer30Days?: number;

    @ApiPropertyOptional({
        example: 3,
        description: 'Unanswered offers in a row before the customer rests.',
    })
    @ValidateIf(given)
    @IsInt()
    @Min(1)
    @Max(MARKETING_SETTINGS_MAX_REST_AFTER)
    restAfter?: number;

    @ApiPropertyOptional({ example: 30, description: 'Days a customer rests.' })
    @ValidateIf(given)
    @IsInt()
    @Min(1)
    @Max(MARKETING_SETTINGS_MAX_REST_DAYS)
    restDays?: number;

    @ApiPropertyOptional({
        example: '09:00',
        description: 'Earliest send time, shop time, "HH:mm".',
    })
    @ValidateIf(given)
    @Matches(MARKETING_SETTINGS_TIME_PATTERN)
    sendFrom?: string;

    @ApiPropertyOptional({
        example: '20:00',
        description: 'Latest send time, shop time, "HH:mm"; after sendFrom.',
    })
    @ValidateIf(given)
    @Matches(MARKETING_SETTINGS_TIME_PATTERN)
    sendTo?: string;

    @ApiPropertyOptional({
        type: [String],
        nullable: true,
        example: ['dừng', 'stop'],
        description:
            'Whole messages that opt a customer out, case and punctuation ignored. Null: the built-in words.',
    })
    @IsOptional()
    @ArrayMinSize(1)
    @ArrayMaxSize(MARKETING_SETTINGS_MAX_STOP_KEYWORDS)
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    @MaxLength(MARKETING_SETTINGS_MAX_STOP_KEYWORD_LENGTH, { each: true })
    stopKeywords?: string[] | null;

    @ApiPropertyOptional({
        nullable: true,
        example: 'Dạ shop sẽ không gửi tin ưu đãi nữa ạ.',
        description:
            'Sent when a customer opts out. Null: the built-in text in the agent language.',
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(MARKETING_SETTINGS_MAX_STOP_REPLY_LENGTH)
    stopReply?: string | null;

    @ApiPropertyOptional({
        description:
            'Gửi lời xác nhận khi khách dừng nhận tin. False: the customer gets no reply when they opt out.',
    })
    @ValidateIf(given)
    @IsBoolean()
    stopReplyEnabled?: boolean;
}

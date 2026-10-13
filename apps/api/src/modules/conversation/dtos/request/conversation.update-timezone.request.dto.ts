import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsTimeZone, Matches, ValidateIf } from 'class-validator';
import { canonicalTimezone } from '@app/modules/chatbot/utils/chatbot-timezone.util';

export class ConversationUpdateTimezoneRequestDto {
    // null clears it; a missing key is rejected so an empty body clears nothing.
    @ValidateIf((_, value) => value !== null)
    @IsTimeZone()
    // A bare offset ("+07:00") passes Intl but is no zone ZoneInfo can load.
    @Matches(/^[A-Za-z]/)
    @Transform(({ value }) => canonicalTimezone(value))
    @ApiProperty({
        description:
            "IANA timezone for times the customer states. null follows the agent's timezone.",
        example: 'America/New_York',
        nullable: true,
        type: String,
    })
    timezone: string | null;
}

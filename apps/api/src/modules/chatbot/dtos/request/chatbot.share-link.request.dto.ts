import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * Preset lifetimes rather than a free-form duration: a share link cannot be
 * revoked, so the set of possible expiries stays small and reviewable.
 */
export enum ENUM_CHATBOT_SHARE_LINK_EXPIRY {
    ONE_HOUR = '1h',
    ONE_DAY = '24h',
    SEVEN_DAYS = '7d',
}

export const CHATBOT_SHARE_LINK_EXPIRY_MS: Record<
    ENUM_CHATBOT_SHARE_LINK_EXPIRY,
    number
> = {
    [ENUM_CHATBOT_SHARE_LINK_EXPIRY.ONE_HOUR]: 60 * 60 * 1000,
    [ENUM_CHATBOT_SHARE_LINK_EXPIRY.ONE_DAY]: 24 * 60 * 60 * 1000,
    [ENUM_CHATBOT_SHARE_LINK_EXPIRY.SEVEN_DAYS]: 7 * 24 * 60 * 60 * 1000,
};

export class ChatbotShareLinkRequestDto {
    @ApiPropertyOptional({
        description: 'How long the public preview link stays valid',
        enum: ENUM_CHATBOT_SHARE_LINK_EXPIRY,
        default: ENUM_CHATBOT_SHARE_LINK_EXPIRY.ONE_DAY,
    })
    @IsOptional()
    @IsEnum(ENUM_CHATBOT_SHARE_LINK_EXPIRY)
    expiresIn?: ENUM_CHATBOT_SHARE_LINK_EXPIRY;
}

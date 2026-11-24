import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    ValidateIf,
} from 'class-validator';
import {
    MARKETING_SEND_MAX_NAME_LENGTH,
    MARKETING_SEND_MAX_TEXT_LENGTH,
} from '../../constants/marketing-send.constant';

/** Left out keeps the saved value; only the picture takes null, to drop it. */
export class MarketingSendUpdateRequestDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(MARKETING_SEND_MAX_NAME_LENGTH)
    name?: string;

    @ApiPropertyOptional({
        description:
            'Offers still waiting to go out are sent with the new text.',
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(MARKETING_SEND_MAX_TEXT_LENGTH)
    text?: string;

    @ApiPropertyOptional({ nullable: true, type: String })
    @ValidateIf((_, value) => value !== undefined && value !== null)
    @IsUrl({ protocols: ['https'], require_protocol: true })
    imageUrl?: string | null;

    @ApiPropertyOptional({
        description:
            'AUTO sends only: false is "Tắt tự gửi", true turns it back on.',
    })
    @IsOptional()
    @IsBoolean()
    active?: boolean;
}

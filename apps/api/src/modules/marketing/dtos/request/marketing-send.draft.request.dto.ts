import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDefined,
    IsEnum,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateIf,
} from 'class-validator';
import {
    MARKETING_DRAFT_LANGUAGES,
    MARKETING_DRAFT_MAX_OFFER_LENGTH,
    MarketingDraftLanguage,
} from '../../constants/marketing-draft.constant';
import { MARKETING_SEND_MAX_TEXT_LENGTH } from '../../constants/marketing-send.constant';
import {
    ENUM_MARKETING_DRAFT_REWRITE,
    ENUM_MARKETING_DRAFT_TONE,
} from '../../enums/marketing-draft.enum';
import { MarketingAudienceRequestDto } from './marketing-audience.request.dto';

/** What the AI drafts a send's text for: who it goes to, and the offer. */
export class MarketingSendDraftRequestDto extends MarketingAudienceRequestDto {
    @ApiPropertyOptional({
        example: 'Giảm 10% cho đơn đặt trước 20/11',
        description:
            "Ưu đãi: the shop's offer in its own words. Left out, the text invites a reply.",
    })
    @IsOptional()
    @IsString()
    @MaxLength(MARKETING_DRAFT_MAX_OFFER_LENGTH)
    offer?: string;

    @ApiPropertyOptional({
        description:
            'The current text, which `rewrite` works on. Needed with `rewrite`.',
    })
    @ValidateIf(
        (dto: MarketingSendDraftRequestDto) =>
            dto.rewrite !== undefined || dto.previous !== undefined
    )
    // IsDefined runs even under the pipe's skipUndefinedProperties.
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @MaxLength(MARKETING_SEND_MAX_TEXT_LENGTH)
    previous?: string;

    @ApiPropertyOptional({
        enum: ENUM_MARKETING_DRAFT_REWRITE,
        description:
            'Viết kiểu khác (DIFFERENT, the default with a `previous`), Dài hơn (LONGER) or Ngắn hơn (SHORTER)',
    })
    @IsOptional()
    @IsEnum(ENUM_MARKETING_DRAFT_REWRITE)
    rewrite?: ENUM_MARKETING_DRAFT_REWRITE;

    @ApiPropertyOptional({
        enum: ENUM_MARKETING_DRAFT_TONE,
        default: ENUM_MARKETING_DRAFT_TONE.FRIENDLY,
        description: 'Giọng văn: Thân thiện, Lịch sự or Vui vẻ',
    })
    @IsOptional()
    @IsEnum(ENUM_MARKETING_DRAFT_TONE)
    tone?: ENUM_MARKETING_DRAFT_TONE;

    @ApiPropertyOptional({ enum: MARKETING_DRAFT_LANGUAGES, default: 'vi' })
    @IsOptional()
    @IsIn(MARKETING_DRAFT_LANGUAGES)
    language?: MarketingDraftLanguage;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
    MARKETING_DRAFT_LANGUAGES,
    MARKETING_DRAFT_MAX_OFFER_LENGTH,
    MarketingDraftLanguage,
} from '../../constants/marketing-draft.constant';
import { MARKETING_SEND_MAX_TEXT_LENGTH } from '../../constants/marketing-send.constant';
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
            'The last draft, so "Viết kiểu khác" writes a different one',
    })
    @IsOptional()
    @IsString()
    @MaxLength(MARKETING_SEND_MAX_TEXT_LENGTH)
    previous?: string;

    @ApiPropertyOptional({ enum: MARKETING_DRAFT_LANGUAGES, default: 'vi' })
    @IsOptional()
    @IsIn(MARKETING_DRAFT_LANGUAGES)
    language?: MarketingDraftLanguage;
}

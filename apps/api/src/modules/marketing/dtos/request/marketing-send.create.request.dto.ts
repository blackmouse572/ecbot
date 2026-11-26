import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
} from 'class-validator';
import {
    MARKETING_SEND_MAX_NAME_LENGTH,
    MARKETING_SEND_MAX_TEXT_LENGTH,
} from '../../constants/marketing-send.constant';
import { ENUM_MARKETING_SEND_MODE } from '../../enums/marketing-send.enum';
import { MarketingAudiencePreviewRequestDto } from './marketing-audience-preview.request.dto';

/** A send: who to (a preset or conditions), how often, and the offer. */
export class MarketingSendCreateRequestDto extends MarketingAudiencePreviewRequestDto {
    @ApiProperty({ example: 'Nhắc khách hỏi giá chưa mua' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(MARKETING_SEND_MAX_NAME_LENGTH)
    name: string;

    @ApiProperty({
        enum: ENUM_MARKETING_SEND_MODE,
        description:
            'ONCE: Chỉ gửi 1 lần. AUTO: Tự gửi mỗi ngày to customers who newly match.',
    })
    @IsEnum(ENUM_MARKETING_SEND_MODE)
    mode: ENUM_MARKETING_SEND_MODE;

    @ApiProperty({
        example:
            'Chào {name}, {product} bạn hỏi vẫn còn hàng. Lumi giảm 10% cho đơn đặt trước 20/11 nha.',
        description:
            '{name} and {product} are filled in for each customer: their name, and the product group they asked about (or bought, for a bought stage).',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(MARKETING_SEND_MAX_TEXT_LENGTH)
    text: string;

    @ApiPropertyOptional({
        description:
            "A picture sent before the text. Left out, each customer gets their product group's photo if it has one.",
    })
    @IsOptional()
    @IsUrl({ protocols: ['https'], require_protocol: true })
    imageUrl?: string;
}

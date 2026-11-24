import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class MarketingSendDraftResponseDto {
    @ApiProperty({
        example: 'Chào {name}, {product} bạn hỏi đang giảm 10% đến 20/11 nha.',
    })
    @Expose()
    text: string;
}

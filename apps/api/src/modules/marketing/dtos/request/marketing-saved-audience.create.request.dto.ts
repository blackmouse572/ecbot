import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { MarketingAudienceRequestDto } from './marketing-audience.request.dto';

export class MarketingSavedAudienceCreateRequestDto extends MarketingAudienceRequestDto {
    @ApiProperty({ example: 'Hỏi giá serum tuần này' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name: string;
}

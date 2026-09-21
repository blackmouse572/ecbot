import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayNotEmpty,
    IsArray,
    IsString,
} from 'class-validator';

export class AccountUpdateAllowedOriginsRequestDto {
    @ApiProperty({
        description:
            'Sites allowed to embed this widget. Enforced as a frame-ancestors CSP on the widget page.',
        example: ['https://shop.example.com'],
        isArray: true,
        type: String,
        required: true,
    })
    @IsArray()
    // An empty list would embed nowhere, which is never what an operator means.
    @ArrayNotEmpty()
    @ArrayMaxSize(50)
    @IsString({ each: true })
    allowedOrigins: string[];
}

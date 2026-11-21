import { ApiProperty } from '@nestjs/swagger';
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    Max,
    MaxLength,
    Min,
    ValidateIf,
} from 'class-validator';

export class ProductGroupCreateRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    @ApiProperty({ example: 'Kem chống nắng' })
    name: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(730)
    @ApiProperty({
        type: Number,
        required: false,
        nullable: true,
        description: 'Days the owner expects between two purchases',
        example: 45,
    })
    defaultRepurchaseDays?: number | null;

    // null clears it.
    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    @MaxLength(2048)
    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        description: 'Where a customer buys it, sent with offers about it',
        example: 'https://shop.example.vn/serum-b5',
    })
    link?: string | null;
}

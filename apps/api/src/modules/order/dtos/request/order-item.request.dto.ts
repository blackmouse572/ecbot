import { ApiProperty } from '@nestjs/swagger';
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    Min,
} from 'class-validator';

export class OrderItemRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    @ApiProperty({ example: 'Kem chống nắng 50ml' })
    name: string;

    @IsOptional()
    @IsUUID()
    @ApiProperty({ type: String, required: false, nullable: true })
    productGroupId?: string | null;

    @IsInt()
    @Min(1)
    @ApiProperty({ example: 1 })
    quantity: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @ApiProperty({
        type: Number,
        required: false,
        nullable: true,
        description: 'Price of one unit in minor units',
        example: 250000,
    })
    unitPrice?: number | null;
}

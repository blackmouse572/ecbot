import { ApiProperty } from '@nestjs/swagger';
import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
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
}

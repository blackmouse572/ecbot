import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';
import { PRODUCT_GROUP_IMAGE_MAX_BYTES } from '../../constants/order.constant';

/** The uploaded photo, with the same size cap as the upload step. */
export class ProductGroupUpdateImageRequestDto {
    @ApiProperty({ description: 'The key the upload step returned' })
    @IsString()
    @IsNotEmpty()
    key: string;

    @ApiProperty({ example: 1024, description: 'Unit in bytes, max 5MB' })
    @Min(1)
    @Max(PRODUCT_GROUP_IMAGE_MAX_BYTES)
    @IsInt()
    size: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    ValidateNested,
} from 'class-validator';

export class UpdateToolkitCategoryRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(60)
    id: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name: string;
}

/** A field sent as null goes back to the code default. */
export class UpdateToolkitRequestDto {
    @ApiPropertyOptional({ nullable: true, example: 'KiotViet' })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name?: string | null;

    @ApiPropertyOptional({ nullable: true })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    description?: string | null;

    @ApiPropertyOptional({ nullable: true, description: 'Logo URL' })
    @IsOptional()
    @IsUrl({ protocols: ['https'], require_protocol: true })
    @MaxLength(500)
    logo?: string | null;

    @ApiPropertyOptional({
        nullable: true,
        type: [UpdateToolkitCategoryRequestDto],
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @ValidateNested({ each: true })
    @Type(() => UpdateToolkitCategoryRequestDto)
    categories?: UpdateToolkitCategoryRequestDto[] | null;

    @ApiPropertyOptional({
        description: 'Hide from the workspace marketplace',
    })
    @IsOptional()
    @IsBoolean()
    disabled?: boolean;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
    ValidateIf,
    ValidateNested,
} from 'class-validator';

export class UpdateToolkitCategoryRequestDto {
    @ApiProperty({ example: 'ecommerce' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(60)
    id: string;

    @ApiProperty({ example: 'E-commerce' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(80)
    name: string;
}

/** A field sent as null goes back to the code default. */
export class UpdateToolkitRequestDto {
    @ApiPropertyOptional({
        type: String,
        nullable: true,
        example: 'KiotViet',
    })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name?: string | null;

    @ApiPropertyOptional({ type: String, nullable: true })
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    description?: string | null;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        description: 'Logo URL',
    })
    @IsOptional()
    @IsUrl({ protocols: ['https'], require_protocol: true })
    @MaxLength(500)
    logo?: string | null;

    @ApiPropertyOptional({
        type: String,
        nullable: true,
        description: 'Base URL of the toolkit server; new installs use it',
    })
    @IsOptional()
    @IsUrl({
        protocols: ['http', 'https'],
        require_protocol: true,
        require_tld: false,
    })
    @MaxLength(500)
    serverUrl?: string | null;

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
    // Not IsOptional: null skips validation, and the column is not null.
    @ValidateIf(o => o.disabled !== undefined)
    @IsBoolean()
    disabled?: boolean;
}

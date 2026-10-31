import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    Matches,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { UpdateToolkitCategoryRequestDto } from './update-toolkit.request.dto';

/** A new Ecbot toolkit, stored as a `toolkit_overrides` row. */
export class CreateToolkitRequestDto {
    @ApiProperty({
        example: 'haravan',
        description: 'Lowercase kebab-case, cannot change later',
    })
    @IsString()
    @MaxLength(60)
    @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    slug: string;

    @ApiProperty({ example: 'Haravan' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    name: string;

    @ApiProperty({
        description: 'Base URL of the toolkit server; installs use it',
    })
    @IsUrl({
        protocols: ['http', 'https'],
        require_protocol: true,
        require_tld: false,
    })
    @MaxLength(500)
    serverUrl: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ description: 'Logo URL' })
    @IsOptional()
    @IsUrl({ protocols: ['https'], require_protocol: true })
    @MaxLength(500)
    logo?: string;

    @ApiPropertyOptional({ type: [UpdateToolkitCategoryRequestDto] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @ValidateNested({ each: true })
    @Type(() => UpdateToolkitCategoryRequestDto)
    categories?: UpdateToolkitCategoryRequestDto[];
}

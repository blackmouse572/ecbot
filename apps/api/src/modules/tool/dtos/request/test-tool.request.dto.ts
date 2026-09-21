import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiPropertyOptions } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsInt,
    IsObject,
    IsOptional,
    IsPositive,
    IsString,
    IsUrl,
    ValidateNested,
} from 'class-validator';
import { HttpAuthDto } from './create-http-tool.request.dto';
import { ENUM_HTTP_METHOD } from 'src/modules/tool/repository/entities/tool.entity';

export class TestSavedToolRequestDto {
    @ApiProperty({
        type: 'object',
        additionalProperties: true,
    } as ApiPropertyOptions)
    @IsObject()
    args!: Record<string, unknown>;
}

export class TestInlineToolRequestDto {
    @ApiProperty({ enum: ENUM_HTTP_METHOD })
    @IsEnum(ENUM_HTTP_METHOD)
    httpMethod!: ENUM_HTTP_METHOD;

    @ApiProperty()
    @IsUrl({ require_tld: false })
    httpUrl!: string;

    @ApiPropertyOptional({
        type: 'object',
        additionalProperties: { type: 'string' },
    } as ApiPropertyOptions)
    @IsOptional()
    @IsObject()
    headers?: Record<string, string>;

    @ApiProperty({ type: HttpAuthDto, required: false })
    @IsOptional()
    @ValidateNested()
    @Type(() => HttpAuthDto)
    auth?: HttpAuthDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    credential?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsInt()
    @IsPositive()
    timeoutMs?: number;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
    } as ApiPropertyOptions)
    @IsObject()
    args!: Record<string, unknown>;
}

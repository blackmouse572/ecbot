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
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';
import { IsJsonSchema } from 'src/common/request/validations/is-json-schema.validation';
import { ENUM_HTTP_METHOD } from 'src/modules/tool/repository/entities/tool.entity';

export class HttpAuthDto {
    @ApiProperty({ enum: ['bearer', 'api_key', 'basic', 'none'] })
    @IsEnum(['bearer', 'api_key', 'basic', 'none'])
    type!: 'bearer' | 'api_key' | 'basic' | 'none';

    @ApiProperty({ enum: ['header', 'query'], required: false })
    @IsOptional()
    @IsEnum(['header', 'query'])
    placement?: 'header' | 'query';

    @ApiProperty({ required: false })
    @IsOptional()
    @IsString()
    paramName?: string;
}

export class CreateHttpToolRequestDto {
    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    name!: string;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    description!: string;

    @ApiProperty({ enum: ENUM_HTTP_METHOD })
    @IsEnum(ENUM_HTTP_METHOD)
    httpMethod!: ENUM_HTTP_METHOD;

    @ApiProperty()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
    httpUrl!: string;

    @ApiProperty({
        type: 'object',
        additionalProperties: true,
        example: {
            type: 'object',
            properties: { name: { type: 'string' } },
            required: ['name'],
        },
    })
    @IsObject()
    @IsJsonSchema()
    inputSchema!: Record<string, unknown>;

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

    @ApiProperty({
        required: false,
        description:
            'Credential plaintext on input; envelope-encrypted on storage',
    })
    @IsOptional()
    @IsString()
    credential?: string;

    @ApiProperty({ required: false, default: 10000 })
    @IsOptional()
    @IsInt()
    @IsPositive()
    timeoutMs?: number;

    @ApiProperty({ required: false, default: 1 })
    @IsOptional()
    @IsInt()
    @IsPositive()
    maxRetries?: number;
}

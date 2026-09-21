import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsEnum,
    IsOptional,
    IsString,
    IsUrl,
    MaxLength,
    MinLength,
    ValidateNested,
} from 'class-validator';

export class CreateMcpToolAuthDto {
    @ApiProperty({ enum: ['bearer', 'api_key', 'none'] })
    @IsEnum(['bearer', 'api_key', 'none'])
    type!: 'bearer' | 'api_key' | 'none';

    @ApiPropertyOptional({ enum: ['header'] })
    @IsOptional()
    @IsEnum(['header'])
    placement?: 'header';

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    paramName?: string;
}

export class CreateMcpToolRequestDto {
    @ApiProperty()
    @IsString()
    @MinLength(1)
    @MaxLength(120)
    name!: string;

    @ApiProperty()
    @IsString()
    @MinLength(1)
    description!: string;

    @ApiProperty()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
    serverUrl!: string;

    @ApiPropertyOptional({ type: CreateMcpToolAuthDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => CreateMcpToolAuthDto)
    auth?: CreateMcpToolAuthDto;

    @ApiPropertyOptional({
        description:
            'Credential plaintext on input; envelope-encrypted on storage',
    })
    @IsOptional()
    @IsString()
    credential?: string;
}

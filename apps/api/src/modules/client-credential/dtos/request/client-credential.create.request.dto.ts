import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
} from 'class-validator';

export class ClientCredentialCreateRequestDto {
    @ApiProperty({
        description: 'Human-friendly name of the client credential',
        example: 'Roberts Group',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(100)
    name: string;

    @ApiPropertyOptional({
        description: 'Start date (ISO) the credential becomes valid',
        example: new Date('2026-02-13T03:40:24.702Z'),
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiPropertyOptional({
        description: 'End date (ISO) the credential expires',
        example: new Date('2026-11-18T00:06:47.251Z'),
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;
}

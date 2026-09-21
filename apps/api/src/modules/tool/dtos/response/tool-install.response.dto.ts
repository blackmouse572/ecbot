import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

export class ToolInstallResponseDto {
    @IsOptional()
    @IsString()
    @ApiPropertyOptional({
        description:
            'OAuth redirect URL. Absent when no authentication required.',
    })
    @Expose()
    redirectUrl?: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({
        description: 'The install session ID. Used to complete the install.',
    })
    @Expose()
    sessionId?: string;

    @IsOptional()
    @IsString()
    @ApiPropertyOptional({
        description:
            'The tool ID (present when install completes immediately).',
    })
    @Expose()
    toolId?: string;
}

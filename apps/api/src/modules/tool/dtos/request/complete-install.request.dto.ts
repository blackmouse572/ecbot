import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CompleteInstallRequestDto {
    @ApiProperty()
    @IsUUID()
    sessionId!: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    connectedAccountId?: string;

    @ApiPropertyOptional({
        description:
            'Opaque bearer token returned by Ecbot-managed MCP consent flows',
    })
    @IsOptional()
    @IsString()
    code?: string;
}

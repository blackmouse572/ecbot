import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ToolTestResponseDto {
    @Expose()
    @ApiProperty()
    status!: string;

    @Expose()
    @ApiPropertyOptional()
    result?: unknown;

    @Expose()
    @ApiPropertyOptional()
    errorMessage?: string;

    @Expose()
    @ApiProperty()
    durationMs!: number;
}

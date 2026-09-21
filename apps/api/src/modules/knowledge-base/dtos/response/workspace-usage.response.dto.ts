import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { DatabaseDto } from '@app/common/database/dtos/database.dto';

export class WorkspaceUsageResponseDto extends DatabaseDto {
    @ApiProperty({
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @Expose()
    @Transform(({ obj }) => obj.workspace?.id || obj.workspaceId)
    workspaceId: string;

    @ApiProperty({
        description: 'Token usage count',
        example: 45000,
    })
    @Expose()
    tokenUsage: number;

    @ApiProperty({
        description: 'Storage usage in bytes',
        example: 5242880,
    })
    @Expose()
    storageUsage: number;

    @ApiProperty({
        description: 'Total documents count',
        example: 42,
    })
    @Expose()
    documentsCount: number;

    @ApiPropertyOptional({
        description: 'Detailed metrics breakdown',
        example: {
            storageByType: { FILE: 3145728, URL: 2097152 },
            documentsByStatus: { READY: 40, PROCESSING: 2 },
        },
    })
    @Expose()
    metrics?: Record<string, any>;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { DatabaseDto } from '@app/common/database/dtos/database.dto';

export class KnowledgeBaseResponseDto extends DatabaseDto {
    @ApiProperty({
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @Expose()
    @Transform(({ obj }) => obj.workspace?.id || obj.workspaceId)
    workspaceId: string;

    @ApiProperty({
        description: 'Knowledge base name',
        example: 'Customer Support KB',
    })
    @Expose()
    name: string;

    @ApiPropertyOptional({
        description: 'Knowledge base description',
        example: 'Contains FAQs and support documentation',
    })
    @Expose()
    description?: string;

    @ApiProperty({
        description: 'Is knowledge base active',
        example: true,
    })
    @Expose()
    isActive: boolean;

    @ApiPropertyOptional({
        description: 'Knowledge base settings',
        example: { chunkSize: 1000 },
    })
    @Expose()
    settings?: Record<string, any>;
}

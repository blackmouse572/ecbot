import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { DatabaseDto } from '@app/common/database/dtos/database.dto';
import { ENUM_USAGE_EVENT_TYPE } from '../../enums/usage-event-type.enum';

export class UsageEventResponseDto extends DatabaseDto {
    @ApiProperty({
        description: 'Workspace ID',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @Expose()
    @Transform(({ obj }) => obj.workspace?.id || obj.workspaceId)
    workspaceId: string;

    @ApiProperty({
        description: 'Event type',
        enum: ENUM_USAGE_EVENT_TYPE,
        example: ENUM_USAGE_EVENT_TYPE.DOCUMENT_PROCESSED,
    })
    @Expose()
    eventType: ENUM_USAGE_EVENT_TYPE;

    @ApiProperty({
        description: 'Amount of usage (bytes for storage, count for documents)',
        example: 5000,
    })
    @Expose()
    amount: number;

    @ApiProperty({
        description: 'Source of usage event',
        example: 'KNOWLEDGE_BASE',
    })
    @Expose()
    source: string;

    @ApiPropertyOptional({
        description: 'User who triggered the event',
        example: '550e8400-e29b-41d4-a716-446655440010',
    })
    @Expose()
    @Transform(({ obj }) => obj.user?.id || obj.userId)
    userId?: string;

    @ApiPropertyOptional({
        description: 'Event-specific metadata and context',
        example: {
            knowledgeItemId: '550e8400-e29b-41d4-a716-446655440002',
            operationType: 'FILE_UPLOAD',
        },
    })
    @Expose()
    metadata?: Record<string, any>;
}

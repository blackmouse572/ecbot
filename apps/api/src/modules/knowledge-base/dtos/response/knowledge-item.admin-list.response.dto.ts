import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ActivityAdminWorkspaceResponseDto } from 'src/modules/activity/dtos/response/activity.admin-workspace.response.dto';
import { ENUM_KNOWLEDGE_BASE_ITEM_STATUS } from '../../enums/knowledge-base-item-status.enum';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../../enums/knowledge-base-item-type.enum';

// One row of the admin knowledge list. An allowlist, never a spread of the
// entity: the item carries its extracted content and storage keys, and the
// workspace its invitation code.
export class KnowledgeItemAdminListResponseDto {
    @ApiProperty({ example: 'bab80caa-50d0-496a-9d19-c8a3c3c93520' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Bảng giá bánh kem' })
    @Expose()
    title: string;

    @ApiProperty({
        enum: ENUM_KNOWLEDGE_BASE_ITEM_TYPE,
        example: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE,
    })
    @Expose()
    type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE;

    @ApiProperty({
        enum: ENUM_KNOWLEDGE_BASE_ITEM_STATUS,
        example: ENUM_KNOWLEDGE_BASE_ITEM_STATUS.COMPLETED,
    })
    @Expose()
    status: ENUM_KNOWLEDGE_BASE_ITEM_STATUS;

    @ApiPropertyOptional({
        example: 204800,
        description: 'Bytes of the uploaded file, for FILE and MEDIA items',
    })
    @Expose()
    size?: number;

    @ApiPropertyOptional({
        example: 'application/pdf',
        description: 'File type of an uploaded file or media item',
    })
    @Expose()
    mimeType?: string;

    @ApiProperty({ example: 12 })
    @Expose()
    chunkCount: number;

    @ApiProperty({ type: ActivityAdminWorkspaceResponseDto })
    @Expose()
    @Type(() => ActivityAdminWorkspaceResponseDto)
    workspace: ActivityAdminWorkspaceResponseDto;

    @ApiProperty({ example: new Date('2026-10-01T05:57:59.265Z') })
    @Expose()
    createdAt: Date;

    @ApiPropertyOptional({ example: new Date('2026-10-02T01:15:36.079Z') })
    @Expose()
    updatedAt?: Date;
}

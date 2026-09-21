import { ApiProperty } from '@nestjs/swagger';

export class KnowledgeItemFolderResponseDto {
    @ApiProperty({
        description: 'Folder ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    id: string;

    @ApiProperty({
        description: 'Folder name',
        example: 'API Documentation',
    })
    name: string;

    @ApiProperty({
        description: 'Parent folder ID (null for root)',
        example: '123e4567-e89b-12d3-a456-426614174000',
        nullable: true,
    })
    parentFolderId: string | null;

    @ApiProperty({
        description: 'Knowledge base ID',
        example: '123e4567-e89b-12d3-a456-426614174000',
    })
    knowledgeBaseId: string;

    @ApiProperty({
        description: 'Is active folder',
        example: true,
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Created at timestamp',
        example: '2026-02-28T05:16:24.950Z',
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Updated at timestamp',
        example: '2026-02-28T05:16:24.950Z',
    })
    updatedAt: Date;
}

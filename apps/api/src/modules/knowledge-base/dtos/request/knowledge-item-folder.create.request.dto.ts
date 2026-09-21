import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class KnowledgeItemFolderCreateRequestDto {
    @ApiProperty({
        description: 'Folder name',
        example: 'API Documentation',
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Parent folder ID (null for root)',
        example: '123e4567-e89b-12d3-a456-426614174000',
        required: false,
    })
    @IsOptional()
    @IsUUID()
    parentFolderId?: string;
}

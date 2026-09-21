import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class KnowledgeItemFolderUpdateRequestDto {
    @ApiProperty({
        description: 'Updated folder name',
        example: 'API Documentation',
        required: false,
    })
    @IsOptional()
    @IsString()
    name?: string;
}

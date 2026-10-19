import { ApiProperty } from '@nestjs/swagger';
import {
    IsIn,
    IsInt,
    IsNotEmpty,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { ENUM_KNOWLEDGE_BASE_ITEM_TYPE } from '../../enums/knowledge-base-item-type.enum';

export class KnowledgeItemUploadUrlRequestDto {
    @ApiProperty({
        description: 'The item the file is for',
        enum: [
            ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE,
            ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA,
        ],
        example: ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA,
    })
    @IsIn([
        ENUM_KNOWLEDGE_BASE_ITEM_TYPE.FILE,
        ENUM_KNOWLEDGE_BASE_ITEM_TYPE.MEDIA,
    ])
    type: ENUM_KNOWLEDGE_BASE_ITEM_TYPE;

    @ApiProperty({
        description: 'File name with its extension, which sets its type',
        example: 'menu.pdf',
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(200)
    fileName: string;

    @ApiProperty({ description: 'File size in bytes', example: 1048576 })
    @IsInt()
    @Min(1)
    size: number;
}

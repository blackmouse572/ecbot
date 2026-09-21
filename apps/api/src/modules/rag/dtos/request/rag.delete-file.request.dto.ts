import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class RAGDeleteFileRequestDto {
    @ApiProperty({
        description: 'The ID of the RAG file to delete',
        type: String,
        required: true,
        example: '507f1f77bcf86cd799439011',
    })
    @IsString()
    @IsNotEmpty()
    @IsMongoId()
    ragId: string;
}

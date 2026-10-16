import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class KnowledgeItemUploadUrlResponseDto {
    @ApiProperty({
        description:
            'PUT the file here, with a Content-Length of exactly `size` bytes.',
    })
    @Expose()
    uploadUrl: string;

    @ApiProperty({
        description: 'Send as `fileKey` when creating the item',
    })
    @Expose()
    fileKey: string;

    @ApiProperty({
        description: 'The type the file name gives the file',
        example: 'application/pdf',
    })
    @Expose()
    mimeType: string;

    @ApiProperty({ description: 'Seconds the link stays valid', example: 900 })
    @Expose()
    expiresIn: number;
}

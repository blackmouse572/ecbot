import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** A file uploaded for a chat message, sent back with the message. */
export class ChatAttachmentRequestDto {
    @ApiProperty({
        description: 'The key the upload endpoint returned',
        example: 'preview-media/0d6b.../5f1c....jpg',
    })
    @IsString()
    @Matches(/^(?!.*\.\.)[A-Za-z0-9_\-/.]{1,300}$/)
    key: string;

    @ApiPropertyOptional({ example: 'menu.pdf' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    name?: string;
}

/** The multipart body of a chat upload: one file under `file`. */
export class ChatAttachmentUploadRequestDto {
    @ApiProperty({
        type: 'string',
        format: 'binary',
        description:
            'An image (JPEG, PNG, WebP, GIF, up to 5 MB) or a PDF, Word, Excel, text or CSV file (up to 10 MB)',
    })
    file: unknown;
}

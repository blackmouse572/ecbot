import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { KnowledgeItemCreateRequestDto } from './knowledge-item.create.request.dto';

/**
 * The /client create body: a FILE or MEDIA item takes its file from a
 * presigned upload (`fileKey`) or a public link (`fileUrl`), since the
 * client surface takes JSON, not multipart.
 */
export class KnowledgeItemClientCreateRequestDto extends KnowledgeItemCreateRequestDto {
    @ApiPropertyOptional({
        description:
            'For FILE or MEDIA: the `fileKey` from POST upload-url, after the file was PUT to its `uploadUrl`.',
        example:
            'knowledge-uploads/c6d23ab2-2f62-41a9-9a0d-24eae66b0316/bab80caa-50d0-496a-9d19-c8a3c3c93520/0f8fad5b-d9cb-469f-a165-70867728950e-menu.pdf',
    })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    fileKey?: string;

    @ApiPropertyOptional({
        description:
            'For FILE or MEDIA: a public http(s) link the API downloads the file from.',
        example: 'https://example.com/menu.pdf',
    })
    @IsOptional()
    @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
    @MaxLength(2000)
    fileUrl?: string;
}

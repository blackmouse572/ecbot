import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

export class ConversationUploadLimitResponseDto {
    @Expose()
    @ApiProperty({ description: 'Largest size in bytes', example: 5242880 })
    maxBytes: number;

    @Expose()
    @ApiProperty({
        description: 'MIME types the channel takes',
        example: ['image/jpeg', 'image/png'],
        type: [String],
    })
    types: string[];
}

export class ConversationUploadsResponseDto {
    @Expose()
    @Type(() => ConversationUploadLimitResponseDto)
    @ApiProperty({
        type: () => ConversationUploadLimitResponseDto,
        required: false,
        description: 'Photos the channel takes',
    })
    image?: ConversationUploadLimitResponseDto;

    @Expose()
    @Type(() => ConversationUploadLimitResponseDto)
    @ApiProperty({
        type: () => ConversationUploadLimitResponseDto,
        required: false,
        description: 'Files the channel takes',
    })
    file?: ConversationUploadLimitResponseDto;
}

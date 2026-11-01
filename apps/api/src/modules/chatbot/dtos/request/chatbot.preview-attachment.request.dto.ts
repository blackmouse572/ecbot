import { ChatAttachmentUploadRequestDto } from '@app/modules/conversation/dtos/request/chat-attachment.request.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsNotEmpty, IsString } from 'class-validator';

/** A share-link upload: the file, and the signed token that allows it. */
export class ChatbotPreviewAttachmentRequestDto extends ChatAttachmentUploadRequestDto {
    @ApiProperty({
        description: 'The signed share token from the public preview link',
    })
    @IsDefined()
    @IsNotEmpty()
    @IsString()
    token: string;
}

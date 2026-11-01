import { ApiProperty } from '@nestjs/swagger';

/** A stored chat upload, to send back with the message. */
export class ChatAttachmentResponseDto {
    @ApiProperty({ enum: ['image', 'file'] })
    type: string;

    @ApiProperty({ description: 'Send this back in the message attachments' })
    key: string;

    @ApiProperty({ example: 'menu.pdf' })
    name: string;
}

import { ApiProperty } from '@nestjs/swagger';

export class ChatbotShareLinkResponseDto {
    @ApiProperty({
        description: 'Public preview URL to hand out — carries the share token',
        example: 'https://app.eccho.io/preview/eyJhbGciOi...',
    })
    url: string;

    @ApiProperty({
        description: 'When the link stops working. It cannot be revoked early.',
    })
    expiresAt: Date;
}

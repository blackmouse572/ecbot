import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/** An account the request asked to link, but that already belongs to a
 * different chatbot: refused rather than moved. */
export class ChatbotLinkAccountSkippedDto {
    @ApiProperty({ description: 'Account ID' })
    @Expose()
    id: string;

    @ApiProperty({ description: 'Account name', example: 'Lotus Spa' })
    @Expose()
    name: string;
}

export class ChatbotLinkAccountResponseDto {
    @ApiProperty({
        description: 'Ids actually linked to the chatbot (or already on it)',
        type: [String],
    })
    @Expose()
    linked: string[];

    @ApiProperty({
        description:
            'Accounts the request asked to link that were refused because they already belong to a different chatbot',
        type: [ChatbotLinkAccountSkippedDto],
    })
    @Expose()
    @Type(() => ChatbotLinkAccountSkippedDto)
    skipped: ChatbotLinkAccountSkippedDto[];
}

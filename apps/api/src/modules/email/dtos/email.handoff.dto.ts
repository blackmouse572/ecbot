import { ApiProperty } from '@nestjs/swagger';

export class EmailHandoffDto {
    @ApiProperty({ required: true, example: 'Linh' })
    chatbotName: string;

    @ApiProperty({ required: true, example: 'Kunmart' })
    workspaceName: string;

    @ApiProperty({
        required: true,
        example: 'keyword_trigger',
        description:
            'Handoff reason code (keyword_trigger, fallback_threshold, tag_trigger, or other)',
    })
    reason: string;

    @ApiProperty({
        required: true,
        example: '/kunmart/conversations/abc-123',
        description: 'Relative path to the conversation',
    })
    conversationUrl: string;

    @ApiProperty({
        required: false,
        example: 'vi',
        description: 'Language to write the email in; English otherwise',
    })
    language?: string;
}

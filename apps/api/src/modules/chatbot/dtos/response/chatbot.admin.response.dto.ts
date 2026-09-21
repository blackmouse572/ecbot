import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ChatbotGetDetailResponseDto } from './chatbot.detail.response.dto';

export class WorkspaceSummary {
    @ApiProperty({
        description: 'Workspace ID',
    })
    id: string;

    @ApiProperty({
        description: 'Workspace name',
        example: 'Marketing Team',
    })
    name: string;

    @ApiProperty({
        description: 'Workspace slug',
        example: 'marketing-team',
    })
    slug: string;

    @ApiProperty({
        description: 'Workspace avatar URL',
        example: 'https://example.com/avatar.jpg',
    })
    avatar?: string;
}

export class ChatbotAdminResponseDto extends OmitType(
    ChatbotGetDetailResponseDto,
    ['workspace'] as const
) {
    @ApiProperty({
        description: 'Populated workspace details',
        type: WorkspaceSummary,
    })
    workspace: WorkspaceSummary;
}

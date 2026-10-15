import { ApiProperty } from '@nestjs/swagger';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';

export class SkillUsageToolResponseDto {
    @ApiProperty({ description: 'Tool id' })
    id: string;

    @ApiProperty({ example: 'Lookup order' })
    name: string;

    @ApiProperty({ enum: ENUM_TOOL_KIND })
    kind: ENUM_TOOL_KIND;

    @ApiProperty({
        required: false,
        description: 'The MCP action a step calls',
        example: 'create_ticket',
    })
    action?: string;
}

export class SkillUsageChatbotResponseDto {
    @ApiProperty({ description: 'Chatbot id' })
    id: string;

    @ApiProperty({ example: 'Hoa Xinh' })
    name: string;

    @ApiProperty({ description: 'Whether the skill is enabled on the chatbot' })
    enabled: boolean;

    @ApiProperty({
        description:
            'Tools the skill calls that this chatbot does not have enabled (an MCP tool also when the action is off)',
        type: 'array',
        items: {
            type: 'object',
            properties: { id: { type: 'string' }, action: { type: 'string' } },
            required: ['id'],
        },
    })
    missingTools: { id: string; action?: string }[];
}

export class SkillUsageResponseDto {
    @ApiProperty({
        type: [SkillUsageToolResponseDto],
        description: 'Workspace tools the skill steps call',
    })
    tools: SkillUsageToolResponseDto[];

    @ApiProperty({
        type: [SkillUsageChatbotResponseDto],
        description: 'Chatbots the skill is attached to',
    })
    chatbots: SkillUsageChatbotResponseDto[];
}

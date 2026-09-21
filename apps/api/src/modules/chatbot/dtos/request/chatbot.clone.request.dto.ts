import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CloneChatbotRequestDto {
    @IsString()
    @IsOptional()
    @MaxLength(255)
    @ApiProperty({
        description:
            'Name of the cloned chatbot (defaults to "[Source] (Copy)")',
        example: 'My Bot (Copy)',
        required: false,
    })
    name?: string;

    @IsString()
    @IsOptional()
    @MaxLength(500)
    @ApiProperty({
        description:
            'Avatar URL of the cloned chatbot (defaults to source avatar)',
        example: 'https://example.com/avatar.png',
        required: false,
    })
    avatar?: string;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({
        description: 'Clone tool-to-chatbot junction records',
        default: true,
        required: false,
    })
    cloneTools?: boolean;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({
        description: 'Clone knowledge-item-to-chatbot junction records',
        default: true,
        required: false,
    })
    cloneKnowledgeItems?: boolean;

    @IsBoolean()
    @IsOptional()
    @ApiProperty({
        description: 'Clone RAG document records',
        default: true,
        required: false,
    })
    cloneRags?: boolean;
}

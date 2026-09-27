import { ApiProperty } from '@nestjs/swagger';

export class AgentBuilderScoredDto {
    @ApiProperty()
    value: string;

    @ApiProperty({ minimum: 0, maximum: 1 })
    confidence: number;
}

export class AgentBuilderSuggestResponseDto {
    @ApiProperty({ type: AgentBuilderScoredDto, nullable: true })
    businessType: AgentBuilderScoredDto | null;

    @ApiProperty({ type: AgentBuilderScoredDto, nullable: true })
    personality: AgentBuilderScoredDto | null;

    @ApiProperty({ type: AgentBuilderScoredDto, nullable: true })
    formality: AgentBuilderScoredDto | null;

    @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
    goals: Record<string, number>;

    @ApiProperty({ type: 'object', additionalProperties: { type: 'number' } })
    rules: Record<string, number>;
}

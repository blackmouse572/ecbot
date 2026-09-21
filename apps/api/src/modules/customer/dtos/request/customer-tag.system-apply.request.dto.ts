import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CustomerTagSystemApplyRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    @ApiProperty()
    tagName: string;

    /**
     * Conversation the agent is currently replying in. Required to fire the
     * handoff path on a `triggersHandoff` tag — without it we can't pick a
     * single conversation to escalate.
     */
    @IsOptional()
    @IsString()
    @ApiProperty({ required: false, nullable: true })
    conversationId?: string | null;
}

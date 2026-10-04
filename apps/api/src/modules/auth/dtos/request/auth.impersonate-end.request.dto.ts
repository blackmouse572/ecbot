import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const IMPERSONATE_END_REASONS = ['manual', 'expired'] as const;
export type ImpersonateEndReason = (typeof IMPERSONATE_END_REASONS)[number];

export class AuthImpersonateEndRequestDto {
    @ApiPropertyOptional({
        enum: IMPERSONATE_END_REASONS,
        default: 'manual',
        description:
            'Why the session is ending. `expired` is sent by the client when the countdown runs out.',
    })
    @IsOptional()
    @IsIn(IMPERSONATE_END_REASONS)
    reason?: ImpersonateEndReason;
}

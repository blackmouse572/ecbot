import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { followupFiresInMinutes } from './followup.list.response.dto';

/**
 * Compact shape the agent's `list_pending_followups` tool consumes — it only
 * needs to know what is still queued and how soon it fires.
 */
export class FollowupPendingResponseDto {
    @ApiProperty({ description: 'Follow-up job ID' })
    @Expose()
    @Transform(({ obj }) => obj.id)
    followupId: string;

    @ApiProperty({ description: 'Reason the follow-up was scheduled' })
    @Expose()
    reason: string;

    @ApiProperty({ description: 'Minutes remaining until the follow-up fires' })
    @Expose()
    @Transform(({ obj }) => followupFiresInMinutes(obj))
    firesInMinutes: number;
}

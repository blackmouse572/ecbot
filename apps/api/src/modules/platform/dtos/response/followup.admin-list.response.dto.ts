import { ApiProperty } from '@nestjs/swagger';
import { Expose, plainToInstance, Transform } from 'class-transformer';
import { ActivityAdminWorkspaceResponseDto } from 'src/modules/activity/dtos/response/activity.admin-workspace.response.dto';
import { FollowupListResponseDto } from './followup.list.response.dto';

// The workspace row adds what an admin needs to judge a follow-up: the
// instruction the bot left itself, retries, and which workspace it is in.
export class FollowupAdminListResponseDto extends FollowupListResponseDto {
    @ApiProperty({ type: ActivityAdminWorkspaceResponseDto })
    @Expose()
    // Narrowed here: a @Transform result skips the nested @Type allowlist.
    @Transform(({ obj }) =>
        plainToInstance(
            ActivityAdminWorkspaceResponseDto,
            obj.chatbot?.workspace,
            { excludeExtraneousValues: true }
        )
    )
    workspace: ActivityAdminWorkspaceResponseDto;

    @ApiProperty({
        description: 'Instruction the bot follows when the follow-up fires',
    })
    @Expose()
    prompt: string;

    @ApiProperty({ description: 'Cloud Tasks delivery attempts so far' })
    @Expose()
    attempts: number;

    @ApiProperty({
        type: String,
        format: 'date-time',
        nullable: true,
    })
    @Expose()
    @Transform(({ obj }) => obj.cancelledAt ?? null)
    cancelledAt: Date | null;

    @ApiProperty({ type: String, format: 'date-time' })
    @Expose()
    createdAt: Date;
}

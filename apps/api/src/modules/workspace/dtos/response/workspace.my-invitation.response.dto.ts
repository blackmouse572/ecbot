import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { WorkspaceSummaryResponseDto } from './workspace-summary.response.dto';

/** A pending invitation sent to the signed-in user's verified email. */
export class WorkspaceMyInvitationResponseDto {
    @ApiProperty({ example: '0b7f2c1e-0000-4000-8000-000000000002' })
    @Expose()
    id: string;

    @ApiProperty({ type: WorkspaceSummaryResponseDto })
    @Expose()
    @Type(() => WorkspaceSummaryResponseDto)
    workspace: WorkspaceSummaryResponseDto;

    @ApiProperty({
        example: 'Lan Nguyen',
        description: "The inviter's name, or their email when unnamed",
    })
    @Expose()
    inviterName: string;

    @ApiProperty({
        example: 'Member',
        description:
            'The role granted on accept: the invitation role, or Member when it has none',
    })
    @Expose()
    roleName: string;

    @ApiProperty({ example: '2026-11-15T08:00:00.000Z' })
    @Expose()
    expiresAt: Date;
}

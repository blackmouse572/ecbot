import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { WorkspaceSummaryResponseDto } from './workspace-summary.response.dto';

/**
 * What a join did. Accepting an invitation (Accept, or a join code when the
 * caller already has one to that workspace) joins: joined true, workspace and
 * roleName set. A join code without an invitation files a request for the
 * owner instead: joined false, requestId set.
 */
export class WorkspaceJoinResultResponseDto {
    @ApiProperty({
        description:
            'True when a pending invitation was accepted instead of filing a request',
    })
    @Expose()
    joined: boolean;

    @ApiProperty({ required: false, description: 'The filed join request' })
    @Expose()
    requestId?: string;

    @ApiProperty({ type: WorkspaceSummaryResponseDto, required: false })
    @Expose()
    @Type(() => WorkspaceSummaryResponseDto)
    workspace?: WorkspaceSummaryResponseDto;

    @ApiProperty({ required: false, example: 'Member' })
    @Expose()
    roleName?: string;
}

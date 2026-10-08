import { ENUM_SEND_EMAIL_PROCESS } from '@app/modules/email/enums/email.enum';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { UserRepository } from '@app/modules/user/repository/repositories/user.repository';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { WorkSpaceRepository } from '@app/modules/workspace/repository/repositories/workspace.repository';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

/**
 * Emails a workspace owner that someone joined, by invitation or an approved
 * request. Written in the current request's language (the owner's own when
 * they approve). Never fails the join.
 */
@Injectable()
export class MemberJoinedEmailService {
    private readonly logger = new Logger(MemberJoinedEmailService.name);

    constructor(
        private readonly workspaceRepository: WorkSpaceRepository,
        private readonly userRepository: UserRepository,
        private readonly cloudTasksClient: CloudTasksQueueClient,
        private readonly cls: ClsService
    ) {}

    async send(workspaceId: string, memberUserId: string): Promise<void> {
        try {
            const [workspace, member] = await Promise.all([
                this.workspaceRepository.findOneById<WorkspaceEntity>(
                    workspaceId,
                    { populate: ['owner'] }
                ),
                this.userRepository.findOneById<UserEntity>(memberUserId),
            ]);
            const owner = workspace?.owner;
            if (!workspace || !member || !owner?.email) return;
            if (owner.id === member.id) return;

            await this.cloudTasksClient.enqueue(
                'email',
                ENUM_SEND_EMAIL_PROCESS.MEMBER_JOINED,
                {
                    send: { email: owner.email, name: owner.name },
                    data: {
                        memberName: member.name || member.email,
                        memberEmail: member.email,
                        workspaceName: workspace.name,
                        membersUrl: `/${workspace.slug}/settings/members`,
                        language:
                            this.cls.get<IRequestApp>(CLS_REQ)?.__language,
                    },
                },
                {
                    taskName: `${ENUM_SEND_EMAIL_PROCESS.MEMBER_JOINED}-${workspaceId}-${memberUserId}-${randomUUID()}`,
                }
            );
        } catch (err: unknown) {
            this.logger.warn(
                `New-member email for workspace ${workspaceId} failed (non-fatal): ${(err as Error)?.message}`
            );
        }
    }
}

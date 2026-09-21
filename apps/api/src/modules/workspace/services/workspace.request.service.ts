import { MessageService } from '@app/common/message/services/message.service';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { NotificationType } from '@app/modules/notification/enums/notification.enum';
import { NotificationService } from '@app/modules/notification/services/notification.service';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import {
    REQUEST_STATUS,
    REQUEST_TYPE,
} from '@app/modules/requests/constant/requests.constant';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '@app/modules/requests/enums/requests.status-code.enum';
import { RequestEntity } from '@app/modules/requests/repository/entities/requests.entity';
import { RequestRepository } from '@app/modules/requests/repository/repositories/requests.repository';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { UserService } from '@app/modules/user/services/user.service';
import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';
import { WorkspaceMemberService } from './workspace.member.service';
import { WorkspaceOwnerService } from './workspace.owner.service';

@Injectable()
export class WorkspaceRequestService {
    constructor(
        private readonly requestRepository: RequestRepository,
        private readonly userService: UserService,
        private readonly workspaceOwnerService: WorkspaceOwnerService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly notificationService: NotificationService,
        private readonly activityService: ActivityService,
        private readonly messageService: MessageService
    ) {}

    async createJoinWorkspaceRequest(
        requestFrom: UserEntity,
        requestTo: string,
        invitationCode: string,
        reason?: string
    ) {
        // Validate the request
        await this.validateJoinWorkspaceRequest(requestFrom.id, requestTo);

        // Check if invitation code is valid
        if (!invitationCode) {
            throw new ConflictException({
                statusCode:
                    ENUM_WORKSPACE_STATUS_CODE_ERROR.INVALID_INVITATION_CODE,
                message: 'workspace.error.invalidInvitationCode',
            });
        }

        // Check if requestTo is the owner of the workspace with this invitation code
        const isOwner = await this.workspaceOwnerService.checkUserIsOwnerAsync(
            requestTo,
            { invitationCode }
        );

        if (!isOwner) {
            throw new ConflictException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.USER_NOT_OWNER,
                message: 'workspace.error.userNotOwner',
            });
        }

        // Find workspace by invitation code
        const workspace =
            await this.workspaceMemberService.findWorkspaceByInvitationCode(
                invitationCode
            );

        // Get the recipient user entity
        const requestToUser = await this.userService.findOneById(requestTo);
        if (!requestToUser) {
            throw new NotFoundException({
                message: 'user.error.notFound',
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
            });
        }

        // Create the request entity
        const request: RequestEntity = new RequestEntity();
        request.type = REQUEST_TYPE.JOIN_WORKSPACE;
        request.requestTo = requestToUser;
        request.workspace = workspace;
        request.requestFrom = requestFrom;
        request.status = REQUEST_STATUS.PENDING;
        request.reason = reason;

        // Save the request
        const newRequest = await this.requestRepository.create(request);

        // Send notification to workspace owner
        if (newRequest) {
            await this.notificationService.createRequestToJoinWorkspace(
                requestTo,
                requestFrom.id,
                {
                    requestId: newRequest.id,
                    workspace: {
                        id: workspace.id,
                        name: workspace.name,
                    },
                    requestorName: requestFrom.name,
                }
            );
        }

        return newRequest;
    }

    private async validateJoinWorkspaceRequest(
        requestFrom: string,
        requestTo: string
    ): Promise<void> {
        if (requestFrom === requestTo) {
            throw new ConflictException({
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.DUPLICATED_REQUESTOR,
                message: 'requests.workspace.sameWithRequestor',
            });
        }

        const [recipient, sameRequest] = await Promise.all([
            this.userService.findOneById(requestTo),
            this.requestRepository.findOne({
                requestFrom,
                requestTo,
                type: REQUEST_TYPE.JOIN_WORKSPACE,
                status: REQUEST_STATUS.PENDING,
            }),
        ]);

        if (!recipient) {
            throw new NotFoundException({
                message: 'user.error.notFound',
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
            });
        }

        if (sameRequest) {
            throw new ConflictException({
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.ALREADY_EXISTS,
                message: 'requests.error.duplicated',
            });
        }
    }

    async approve(
        requestId: string,
        workspace: WorkspaceEntity
    ): Promise<void> {
        const request = await this.requestRepository.findOne({ id: requestId });

        if (!request) {
            throw new BadRequestException({
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'requests.error.notFound',
            });
        }

        if (request.isCancelled || request.isApproved || request.isRejected) {
            throw new ConflictException({
                statusCode:
                    ENUM_REQUEST_STATUS_CODE_ERROR.REQUEST_APPROVE_FAILED,
                message: 'requests.workspace.isNotInPending',
            });
        }

        request.status = REQUEST_STATUS.APPROVED;

        await this.requestRepository
            .getEntityManager()
            .persistAndFlush(request);

        switch (request.type) {
            case REQUEST_TYPE.JOIN_WORKSPACE:
                await this.workspaceOwnerService.addMemberToWorkspace(
                    workspace.id,
                    request.requestFrom.id
                );

                const [requestor, recipient] = await Promise.all([
                    this.userService.findOneById(request.requestFrom.id),
                    this.userService.findOneById(request.requestTo.id),
                ]);

                await this.activityService.createByUser(recipient, {
                    action: ENUM_ACTIVITY_ACTION.APPROVE_JOIN_WORKSPACE,
                    subject: ENUM_POLICY_SUBJECT.WORKSPACE,
                    metadata: {
                        workspace: {
                            id: workspace.id,
                        },
                        requestor: {
                            id: requestor.id,
                        },
                    },
                });

                await this.notificationService.create({
                    title: this.messageService.setMessage(
                        'requests.workspace.approveTitle'
                    ),
                    message: this.messageService.setMessage(
                        'requests.workspace.approveMessage',
                        {
                            properties: {
                                workspaceName: workspace.name,
                            },
                        }
                    ),
                    type: NotificationType.SUCCESS,
                    recipient: request.requestFrom.id,
                    sender: workspace.owner.id,
                    metadata: {
                        actionText: 'Go to Workspace',
                    },
                });
        }
    }
}

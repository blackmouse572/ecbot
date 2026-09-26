import { MessageService } from '@app/common/message/services/message.service';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { UserService } from '@app/modules/user/services/user.service';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { WorkspaceRequestService } from '@app/modules/workspace/services/workspace.request.service';
import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { REQUEST_STATUS, REQUEST_TYPE } from '../constant/requests.constant';
import { RequestCreateDto } from '../dtos/request/requests.create.request';
import { RequestListResponseDto } from '../dtos/response/requests-list.response.dto';
import { ENUM_REQUEST_STATUS_CODE_ERROR } from '../enums/requests.status-code.enum';
import { RequestEntity } from '../repository/entities/requests.entity';
import { RequestRepository } from '../repository/repositories/requests.repository';

@Injectable()
export class RequestService {
    constructor(
        private readonly requestRepository: RequestRepository,
        private readonly userService: UserService,
        private readonly workspaceRequestService: WorkspaceRequestService,
        private readonly messageService: MessageService
    ) {}

    // Pending join requests are the only thing the workspace screen lists.
    private joinRequestFilter(workspace: WorkspaceEntity) {
        return {
            workspace: workspace.id,
            type: REQUEST_TYPE.JOIN_WORKSPACE,
            status: REQUEST_STATUS.PENDING,
        };
    }

    async findByWorkspace(
        workspace: WorkspaceEntity
    ): Promise<RequestEntity[]> {
        return this.requestRepository.find(this.joinRequestFilter(workspace), {
            populate: ['requestFrom'],
        });
    }

    async getTotalByWorkspace(workspace: WorkspaceEntity): Promise<number> {
        return this.requestRepository.count(this.joinRequestFilter(workspace));
    }

    mapList(requests: RequestEntity[]): RequestListResponseDto[] {
        return plainToInstance(RequestListResponseDto, requests, {
            excludeExtraneousValues: true,
        });
    }

    async findOneById(id: string): Promise<RequestEntity> {
        const request = await this.requestRepository.findOne({ id });

        if (!request) {
            throw new NotFoundException({
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'requests.error.notFound',
            });
        }

        return request;
    }

    async create(
        requestFrom: UserEntity,
        data: RequestCreateDto,
        _workspace?: WorkspaceEntity
    ): Promise<RequestEntity> {
        const { type } = data;
        await this.validateRequest(requestFrom.id, data);

        switch (type) {
            case REQUEST_TYPE.JOIN_WORKSPACE:
                return this.workspaceRequestService.createJoinWorkspaceRequest(
                    requestFrom,
                    data.requestTo,
                    data.payload?.invitationCode,
                    data.reason
                );

            default:
                throw new ConflictException({
                    statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.ALREADY_EXISTS,
                    message: 'requests.error.unsupportedType',
                });
        }
    }

    async validateRequest(
        requestFrom: string,
        data: RequestCreateDto
    ): Promise<void> {
        const { type, requestTo } = data;

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
                type,
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
        // Scope the lookup to the workspace being approved in — otherwise a
        // request id that belongs to a different workspace would still
        // resolve, letting an owner approve a foreign join-request.
        const request = await this.requestRepository.findOne({
            id: requestId,
            workspace: workspace.id,
        });

        if (!request) {
            throw new NotFoundException({
                statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'requests.error.notFound',
            });
        }

        // Delegate workspace request approval to WorkspaceRequestService
        if (request.type === REQUEST_TYPE.JOIN_WORKSPACE) {
            return this.workspaceRequestService.approve(requestId, workspace);
        }

        // Handle other request types here if needed
        throw new ConflictException({
            statusCode: ENUM_REQUEST_STATUS_CODE_ERROR.ALREADY_EXISTS,
            message: 'requests.error.unsupportedType',
        });
    }
}

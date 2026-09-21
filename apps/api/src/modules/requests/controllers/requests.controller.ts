import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import { IResponsePaging } from '@app/common/response/interfaces/response.interface';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from '@app/modules/auth/interfaces/auth.interface';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { UserService } from '@app/modules/user/services/user.service';
import {
    WorkspaceOwnerProtected,
    WorkspacePayload,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
    ApproveRequestDoc,
    CreateRequestsDoc,
    RequestListDoc,
} from '../docs/requests.doc';
import { RequestCreateDto } from '../dtos/request/requests.create.request';
import { RequestListResponseDto } from '../dtos/response/requests-list.response.dto';
import { RequestService } from '../services/requests.service';

@ApiTags('modules.shared.requests')
@Controller({
    version: '1',
    path: '/:workspaceId/requests',
})
export class RequestController {
    constructor(
        private readonly requestService: RequestService,
        private readonly userService: UserService
    ) {}

    @RequestListDoc()
    @ResponsePaging('requests.list')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Get('/list')
    async getRequests(
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponsePaging<RequestListResponseDto>> {
        const [requests, total] = await Promise.all([
            this.requestService.findByWorkspace(workspace),
            this.requestService.getTotalByWorkspace(workspace),
        ]);

        return {
            // Pending join requests are few — returned unpaged as a single page.
            _pagination: { total, totalPage: 1 },
            data: this.requestService.mapList(requests),
        };
    }

    @CreateRequestsDoc()
    @Response('requests.create.success')
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/create')
    async createRequest(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserEntity,
        @Body() dto: RequestCreateDto
    ) {
        return this.requestService.create(user, dto);
    }

    @ApproveRequestDoc()
    @Response('requests.approve.success')
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/approve/:id')
    async approveRequest(
        @Param('id') requestId: string,
        @WorkspacePayload() workspace: WorkspaceEntity
    ) {
        return this.requestService.approve(requestId, workspace);
    }
}

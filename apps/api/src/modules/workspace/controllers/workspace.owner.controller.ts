import { PaginationQuery } from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from '@app/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from '@app/modules/auth/interfaces/auth.interface';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import { EmailService } from '@app/modules/email/services/email.service';
import { NotificationService } from '@app/modules/notification/services/notification.service';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';
import { UserActiveParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { UserService } from '@app/modules/user/services/user.service';
import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    Logger,
    NotFoundException,
    Post,
    Put,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import * as multer from 'multer';
import { WORKSPACE_DEFAULT_AVAILABLE_SEARCH } from '../constants/workspace.constant';
import {
    WorkspaceMemberOrOwnerProtected,
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from '../decorators/workspace.decorator';
import {
    WorkspaceInvitationDoc,
    WorkSpaceOwnerCreateDoc,
    WorkSpaceOwnerDeleteDoc,
    WorkSpaceOwnerGetDoc,
    WorkSpaceOwnerGetListDoc,
    WorkspaceOwnerProfileDoc,
    WorkSpaceOwnerUpdateDoc,
} from '../docs/workspace.owner.doc';
import { WorkSpaceCreateRequestDto } from '../dtos/request/workspace.create.request';
import { WorkSpaceInviteMemberRequestDto } from '../dtos/request/workspace.invite-member.request';
import { WorkSpaceUpdateRequestDto } from '../dtos/request/workspace.update.request';
import { WorkspaceGetProfileResponseDto } from '../dtos/response/workspace.get-profile.response';
import { WorkSpaceListResponseDto } from '../dtos/response/workspace.list.response';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';
import { WorkspaceMemberService } from '../services/workspace.member.service';
import { WorkspaceOwnerService } from '../services/workspace.owner.service';
import { WorkSpaceGetResponseDto } from '../dtos/response/workspace.get.response';

@ApiTags('modules.owner.workspace')
@Controller({
    version: '1',
    path: 'workspace',
})
export class WorkspaceController {
    private readonly homeUrl: string;

    constructor(
        private readonly userService: UserService,
        private readonly workSpaceService: WorkspaceOwnerService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly paginationService: PaginationService,
        private readonly emailService: EmailService,
        private readonly activityService: ActivityService,
        private readonly notificationService: NotificationService,
        private readonly awsS3Service: AwsS3Service,
        private readonly configService: ConfigService
    ) {
        // Same pattern as reset-password.service.ts: the emailed invite link
        // must come from configured home.url, not the caller-controlled
        // Origin header (@GetClientOrigin), which let a caller point the
        // link at an attacker-controlled host.
        this.homeUrl = (
            this.configService.get<string>('home.url') ?? ''
        ).replace(/\/$/, '');
    }

    private readonly logger = new Logger();

    @WorkspaceOwnerProfileDoc()
    @Response('user.profile')
    @WorkspaceMemberOrOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:workspace/profile')
    async profile(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity,
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<WorkspaceGetProfileResponseDto>> {
        // The owner is also stored as a WorkspaceMember (with the owner role),
        // so resolve the membership for everyone and populate the role so its
        // permissions reach the client. Populate the role's permissions.
        const workspaceMember = await this.workspaceMemberService
            .findOne(
                {
                    workspace: workspace.id,
                    user: user.id,
                },
                { populate: ['role'] }
            )
            .then(this.workspaceMemberService.join);

        const isOwner = this.workSpaceService.checkUserIsOwner(user, workspace);

        // A non-owner with no membership doesn't belong to this workspace.
        if (!workspaceMember && !isOwner) {
            throw new NotFoundException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'workspace.error.notFound',
            });
        }

        const mapped: WorkspaceGetProfileResponseDto = {
            ...this.userService.mapProfile(user),
            isOwner,
            ...(workspaceMember
                ? {
                      workspaceMember:
                          this.workspaceMemberService.mapProfile(
                              workspaceMember
                          ),
                  }
                : {}),
        };
        return { data: mapped };
    }

    private async uploadAvatarImage(
        image: Express.Multer.File,
        userId: string
    ): Promise<string> {
        const key = `workspace/avatar/${userId}_${Date.now()}_${image.originalname}`;
        const uploaded = await this.awsS3Service.putItem({
            key,
            file: image.buffer,
            size: image.size,
        });
        return uploaded.completedUrl;
    }

    @WorkSpaceOwnerGetListDoc()
    @ResponsePaging('workspace.list')
    @AuthJwtAccessProtected()
    @Get('/list')
    async getListWorkSpace(
        @AuthJwtPayload('user') userId: string,
        @PaginationQuery({
            availableSearch: WORKSPACE_DEFAULT_AVAILABLE_SEARCH,
        })
        { _search, _limit, _offset, _order }: PaginationListDto
    ): Promise<IResponsePaging<WorkSpaceListResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
        };
        const ownedWorkspaces = await this.workSpaceService.getListByOwner(
            userId,
            find,
            {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }
        );
        // The owner is also stored as a WorkspaceMember, so a workspace can
        // surface in both lists. Drop membered workspaces that are already
        // owned (or soft-deleted) to avoid duplicates.
        const ownedIds = new Set(ownedWorkspaces.map(w => w.id));
        const memberedWorkspaces = await this.workspaceMemberService
            .findAll(
                {
                    user: userId,
                },
                {
                    populate: ['workspace'],
                }
            )
            .then(res =>
                res
                    .map(member => member.workspace)
                    .filter(w => w && !w.deleted && !ownedIds.has(w.id))
            );

        const total: number =
            (await this.workSpaceService.getTotalByOwner(userId)) +
            memberedWorkspaces.length;

        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = this.workSpaceService.mapList([
            ...ownedWorkspaces,
            ...memberedWorkspaces,
        ]);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @WorkSpaceOwnerCreateDoc()
    @Response('workspace.create')
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/create')
    @UseInterceptors(
        FileInterceptor('image', { storage: multer.memoryStorage() })
    )
    @ApiConsumes('multipart/form-data')
    async createWorkSpace(
        @AuthJwtPayload('user') userId: string,
        @Body() body: WorkSpaceCreateRequestDto,
        @UploadedFile() image?: Express.Multer.File
    ): Promise<IResponse<WorkSpaceGetResponseDto>> {
        const user = await this.userService.findOneById(userId);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'workspace.error.notFound',
            });
        }

        // An owner may have multiple workspaces. Slug uniqueness is still
        // enforced at the DB level and translated to a 409 in the service.
        // No image uploaded: the service seeds a default DiceBear avatar.
        const avatarUrl = image
            ? await this.uploadAvatarImage(image, user.id)
            : undefined;

        const newWorkspace = await this.workSpaceService.create(user, {
            ...body,
            image: avatarUrl,
        });

        await this.activityService.createByUserWithWorkspace(
            user,
            newWorkspace,
            {
                action: ENUM_ACTIVITY_ACTION.CREATE,
                subject: ENUM_POLICY_SUBJECT.WORKSPACE,
                metadata: {
                    id: newWorkspace.id,
                    name: newWorkspace.name,
                },
            }
        );

        return { data: this.workSpaceService.mapGet(newWorkspace) };
    }

    @WorkSpaceOwnerUpdateDoc()
    @Response('workspace.update')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.WORKSPACE,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @Put('/:workspace/update')
    @UseInterceptors(
        FileInterceptor('image', { storage: multer.memoryStorage() })
    )
    @ApiConsumes('multipart/form-data')
    async updateWorkSpace(
        @AuthJwtPayload('user') userId: string,
        @Body() body: WorkSpaceUpdateRequestDto,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @UploadedFile() image?: Express.Multer.File
    ) {
        if (!workspace) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'workspace.error.notFound',
            });
        }
        if (workspace.owner.id !== userId) {
            throw new ConflictException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.USER_NOT_OWNER,
                message: 'workspace.error.userNotOwner',
            });
        }
        const avatarUrl = image
            ? await this.uploadAvatarImage(image, userId)
            : workspace.avatar;
        await this.workSpaceService.update(workspace, {
            ...body,
            image: avatarUrl,
        });
        const user = await this.userService.findOneById(userId);
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.WORKSPACE,
            metadata: {
                _id: workspace.id,
                name: workspace.name,
                old: {
                    name: workspace.name,
                    slug: workspace.slug,
                    avatar: workspace.avatar,
                    // owner: workspace.owner,
                },
                new: {
                    name: body.name,
                    slug: body.slug,
                    avatar: avatarUrl,
                    // owner: body.owner,
                },
            },
        });
    }

    @WorkSpaceOwnerDeleteDoc()
    @Response('workspace.delete')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.WORKSPACE,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @Delete('/:workspace/delete')
    async deleteWorkSpace(
        @AuthJwtPayload('user') userId: string,
        @WorkspacePayload() workspace: WorkspaceEntity
    ): Promise<IResponse<boolean>> {
        if (workspace.owner.id !== userId) {
            throw new ConflictException({
                statusCode: ENUM_WORKSPACE_STATUS_CODE_ERROR.USER_NOT_OWNER,
                message: 'workspace.error.userNotOwner',
            });
        }

        await this.workSpaceService.delete(workspace, userId);

        const user = await this.userService.findOneById(userId);
        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.WORKSPACE,
            metadata: {
                id: workspace.id,
                name: workspace.name,
            },
        });

        return { data: true };
    }

    @WorkspaceInvitationDoc()
    @Response('workspace.owner.inviteMember.success')
    @WorkspacePolicyAbilityProtected({
        action: [ENUM_POLICY_ACTION.CREATE],
        subject: ENUM_POLICY_SUBJECT.MEMBER,
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/invite-member/:workspace')
    async inviteMemberToWorkSpace(
        @AuthJwtPayload('user') userId: string,
        @Body() body: WorkSpaceInviteMemberRequestDto,
        @WorkspacePayload() workspace: WorkspaceEntity
    ) {
        // Generate invitation link and get details. The invitation targets
        // the workspace resolved from the URL (workspace.id) — not just any
        // workspace this caller happens to own.
        const { invitationLink, expiresAt } =
            await this.workSpaceService.generateInvitationLinkWithDetails(
                userId,
                body,
                this.homeUrl,
                workspace.id
            );

        this.logger.debug(
            `Generated link expiresAt ${expiresAt.toLocaleDateString('vi-VN')}: ${invitationLink}`
        );

        await this.emailService.sendInvitationToWorkSpace(
            {
                email: body.invitedEmail,
                name: '',
            },
            {
                invitationLink,
            }
        );

        const user = await this.userService.findOneByEmail(body.invitedEmail);

        if (user) {
            await this.notificationService.createWorkspaceInvitation(
                user.id,
                userId,
                { id: workspace.id, name: workspace.name, invitationLink }
            );
        }

        return {
            data: {
                invitationLink,
                expiresAt,
            },
        };
    }

    @Response('workspace.details')
    @WorkSpaceOwnerGetDoc()
    @WorkspaceMemberOrOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Get('/:workspace')
    async details(
        @AuthJwtPayload('user') _userId: string,
        @WorkspacePayload() workspace: WorkspaceEntity
    ) {
        return { data: workspace };
    }
}

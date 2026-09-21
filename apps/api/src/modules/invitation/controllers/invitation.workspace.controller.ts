import {
    PaginationQuery,
    PaginationQueryFilterInEnum,
} from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import {
    Response,
    ResponsePaging,
} from '@app/common/response/decorators/response.decorator';
import { IResponsePaging } from '@app/common/response/interfaces/response.interface';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    WorkspaceOwnerProtected,
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    Body,
    ConflictException,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { ApiTags } from '@nestjs/swagger';
import {
    INVITATION_DEFAULT_AVAILABLE_SEARCH,
    INVITATION_DEFAULT_STATUS,
    INVITATION_STATUS_FILTER_FIELD,
} from '../constants/invitation.list.constant';
import {
    InvitationDetailDoc,
    InvitationListDoc,
    InvitationRegenerateDoc,
    InvitationRevokeDoc,
    InvitationUpdateRoleDoc,
} from '../docs/invitation.workspace.doc';
import { UpdateInvitationRoleRequestDto } from '../dtos/request/invitation.update-role.request.dto';
import { InvitationDetailResponseDto } from '../dtos/response/invitation-detail.response.dto';
import { InvitationListResponseDto } from '../dtos/response/invitation-list.response.dto';
import {
    ENUM_INVITATION_STATUS,
    ENUM_INVITATION_STATUS_CODE_ERROR,
} from '../enums/invitation.enum';
import { InvitationService } from '../services/invitation.service';

@ApiTags('modules.workspace.invitation')
@Controller({
    version: '1',
    path: '/:workspace/invitations',
})
export class InvitationWorkspaceController {
    private readonly invitationTokenSecret: string;
    private readonly invitationTokenExpired: string;

    constructor(
        private readonly invitationService: InvitationService,
        private readonly paginationService: PaginationService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly activityService: ActivityService
    ) {
        this.invitationTokenSecret = this.configService.get<string>(
            'workspace.invitationKey'
        );
        this.invitationTokenExpired = this.configService.get<string>(
            'workspace.invitationExpired'
        );
    }

    @InvitationListDoc()
    @ResponsePaging('invitation.list')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MEMBER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Get('/list')
    async getInvitations(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @PaginationQuery({
            availableSearch: INVITATION_DEFAULT_AVAILABLE_SEARCH,
        })
        { _limit, _offset, _order, _search }: PaginationListDto,
        @PaginationQueryFilterInEnum(
            INVITATION_STATUS_FILTER_FIELD,
            INVITATION_DEFAULT_STATUS,
            ENUM_INVITATION_STATUS
        )
        _status?: Record<string, any>
    ): Promise<IResponsePaging<InvitationListResponseDto>> {
        const find = {
            ..._search,
            ..._status,
            workspace: workspace.id,
        };
        const invitations = await this.invitationService.findByWorkspace(
            workspace.id,
            find,
            {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }
        );

        const total: number = await this.invitationService.getTotalByWorkspace(
            workspace.id
        );

        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped = await this.invitationService.mapList(invitations);

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @InvitationDetailDoc()
    @Response('invitation.detail')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MEMBER,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Get('/:invitation')
    async getInvitationDetail(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('invitation') invitationId: string
    ): Promise<{ data: InvitationDetailResponseDto }> {
        const invitation = await this.invitationService.findOneById(
            invitationId,
            {
                populate: ['workspace', 'role'],
            }
        );

        // Verify invitation belongs to this workspace
        if (invitation.workspace.id !== workspace.id) {
            throw new NotFoundException({
                statusCode: ENUM_INVITATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'invitation.error.notFound',
            });
        }

        const mapped = await this.invitationService.mapDetail(invitation);

        return { data: mapped };
    }

    @InvitationUpdateRoleDoc()
    @Response('invitation.updateRole')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.WORKSPACE,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Put('/:invitation/role')
    async updateInvitationRole(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('invitation') invitationId: string,
        @Body() body: UpdateInvitationRoleRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<{ data: InvitationDetailResponseDto }> {
        const invitation = await this.invitationService.findOneById(
            invitationId,
            {
                populate: ['workspace', 'role'],
            }
        );

        // Verify invitation belongs to this workspace
        if (invitation.workspace.id !== workspace.id) {
            throw new NotFoundException({
                statusCode: ENUM_INVITATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'invitation.error.notFound',
            });
        }

        // Check if invitation is still pending
        if (invitation.status !== ENUM_INVITATION_STATUS.PENDING) {
            throw new ConflictException({
                statusCode:
                    ENUM_INVITATION_STATUS_CODE_ERROR.CANNOT_INVITE_OWNER,
                message: 'invitation.error.cannotUpdateNonPending',
            });
        }

        const updatedInvitation = await this.invitationService.updateRole(
            invitationId,
            body.roleId
        );

        const mapped =
            await this.invitationService.mapDetail(updatedInvitation);

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.UPDATE,
            subject: ENUM_POLICY_SUBJECT.INVITATION,
            metadata: {
                id: updatedInvitation.id,
                name: updatedInvitation.inviteeEmail,
            },
        });

        return { data: mapped };
    }

    @InvitationRegenerateDoc()
    @Response('invitation.regenerate')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.WORKSPACE,
        action: [ENUM_POLICY_ACTION.UPDATE],
    })
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Post('/:invitation/regenerate')
    async regenerateInvitation(
        @AuthJwtPayload('user') userId: string,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('invitation') invitationId: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<{ data: InvitationDetailResponseDto }> {
        const invitation = await this.invitationService.findOneById(
            invitationId,
            {
                populate: ['workspace', 'role'],
            }
        );

        // Verify invitation belongs to this workspace
        if (invitation.workspace.id !== workspace.id) {
            throw new NotFoundException({
                statusCode: ENUM_INVITATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'invitation.error.notFound',
            });
        }

        // Check if invitation is still pending
        if (invitation.status !== ENUM_INVITATION_STATUS.PENDING) {
            throw new ConflictException({
                statusCode:
                    ENUM_INVITATION_STATUS_CODE_ERROR.CANNOT_INVITE_OWNER,
                message: 'invitation.error.cannotRegenerateNonPending',
            });
        }

        // Generate new token and expiration
        const payload = {
            ownerId: userId,
            workspaceId: workspace.id,
            invitedEmail: invitation.inviteeEmail,
            // The role RELATION, not the whole entity — embedding the entity
            // bloats the JWT (and the invitation_link) past the column limit.
            roleId: invitation.role?.id,
        };

        const newToken = this.jwtService.sign(payload, {
            privateKey: this.invitationTokenSecret,
            expiresIn: this.invitationTokenExpired,
            algorithm: 'HS256',
        } as JwtSignOptions);

        const expirationTime = this.configService.get<string>(
            'workspace.invitationExpired'
        );
        const expirationMs = this.parseExpiration(expirationTime);
        const newExpiresAt = new Date(Date.now() + expirationMs);

        // TODO: Get the actual client URL from request or config
        const newInvitationLink = `https://app.example.com/join?token=${newToken}`;

        const updatedInvitation = await this.invitationService.regenerateToken(
            invitationId,
            newToken,
            newExpiresAt,
            newInvitationLink
        );

        const mapped =
            await this.invitationService.mapDetail(updatedInvitation);

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.INVITATION,
            metadata: {
                id: updatedInvitation.id,
                name: updatedInvitation.inviteeEmail,
            },
        });

        return { data: mapped };
    }

    @InvitationRevokeDoc()
    @Response('invitation.revoke')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.MEMBER,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @WorkspaceOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @Delete('/:invitation')
    async revokeInvitation(
        @AuthJwtPayload('user') userId: string,
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('invitation') invitationId: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<{ data: InvitationDetailResponseDto }> {
        const invitation = await this.invitationService.findOneById(
            invitationId,
            {
                populate: ['workspace', 'role'],
            }
        );

        // Verify invitation belongs to this workspace
        if (invitation.workspace.id !== workspace.id) {
            throw new NotFoundException({
                statusCode: ENUM_INVITATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'invitation.error.notFound',
            });
        }

        // Check if invitation is still pending
        if (invitation.status !== ENUM_INVITATION_STATUS.PENDING) {
            throw new ConflictException({
                statusCode:
                    ENUM_INVITATION_STATUS_CODE_ERROR.CANNOT_INVITE_OWNER,
                message: 'invitation.error.cannotRevokeNonPending',
            });
        }

        const revokedInvitation = await this.invitationService.revoke(
            invitationId,
            userId
        );

        const mapped =
            await this.invitationService.mapDetail(revokedInvitation);

        await this.activityService.createByUserWithWorkspace(user, workspace, {
            action: ENUM_ACTIVITY_ACTION.DELETE,
            subject: ENUM_POLICY_SUBJECT.INVITATION,
            metadata: {
                id: revokedInvitation.id,
                name: revokedInvitation.inviteeEmail,
            },
        });

        return { data: mapped };
    }

    private parseExpiration(expiration: string): number {
        // Parse strings like "7d", "24h", "30m" to milliseconds
        const match = expiration.match(/^(\d+)([dhm])$/);
        if (!match) {
            return 24 * 60 * 60 * 1000; // Default to 24 hours
        }

        const value = parseInt(match[1], 10);
        const unit = match[2];

        switch (unit) {
            case 'd':
                return value * 24 * 60 * 60 * 1000;
            case 'h':
                return value * 60 * 60 * 1000;
            case 'm':
                return value * 60 * 1000;
            default:
                return 24 * 60 * 60 * 1000;
        }
    }
}

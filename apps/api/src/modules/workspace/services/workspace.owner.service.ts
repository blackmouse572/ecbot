import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseUpdateOptions,
} from '@app/common/database/interfaces/database.interface';
import { HelperAvatarService } from '@app/common/helper/services/helper.avatar.service';
import { HelperHashService } from '@app/common/helper/services/helper.hash.service';
import { HelperStringService } from '@app/common/helper/services/helper.string.service';
import { InvitationService } from '@app/modules/invitation/services/invitation.service';
import { ENUM_POLICY_ROLE_TYPE } from '@app/modules/policy/enums/policy.enum';
import { RoleEntity } from '@app/modules/role/repository/entities/role.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    ConflictException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { plainToInstance } from 'class-transformer';
import slugify from 'slugify';
import { RoleService } from 'src/modules/role/services/role.service';
import {
    WORKSPACE_DEFAULT_MEMBER_ROLES,
    WORKSPACE_INVITATION_CODE_LENGTH,
} from '../constants/workspace.constant';
import { WorkSpaceCreateRequestDto } from '../dtos/request/workspace.create.request';
import { WorkSpaceInviteMemberRequestDto } from '../dtos/request/workspace.invite-member.request';
import { WorkSpaceUpdateRequestDto } from '../dtos/request/workspace.update.request';
import { WorkSpaceGetResponseDto } from '../dtos/response/workspace.get.response';
import { WorkSpaceListResponseDto } from '../dtos/response/workspace.list.response';
import { ENUM_WORKSPACE_STATUS_CODE_ERROR } from '../enums/workspace.status-code.enum';
import { InvitationLinkPayload } from '../interfaces/workspace.interface';
import {
    WORKSPACE_CREATED_HOOK,
    WorkspaceCreatedHook,
} from '../interfaces/workspace-created-hook.interface';
import { IWorkspaceOwnerService } from '../interfaces/workspace.owner.service.interface';
import { WorkspaceMemberEntity } from '../repository/entities/workspace-member.entity';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';
import { WorkspaceMemberRepository } from '../repository/repositories/workspace-member.repository';
import { WorkSpaceRepository } from '../repository/repositories/workspace.repository';
import { WorkspaceMemberService } from './workspace.member.service';
import { KnowledgeBaseService } from '@app/modules/knowledge-base/services/knowledge-base.service';
import { CUSTOMER_TAG_DEFAULTS } from '@app/modules/customer/constants/customer-tag.seed.constant';
import { CustomerTagService } from '@app/modules/customer/services/customer-tag.service';
import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { CustomerEntity } from '@app/modules/customer/repository/entities/customer.entity';
import { ContactPointEntity } from '@app/modules/customer/repository/entities/contact-point.entity';
import { CustomerTagEntity } from '@app/modules/customer/repository/entities/customer-tag.entity';
import { KnowledgeBaseEntity } from '@app/modules/knowledge-base/repository/entities/knowledge-base.entity';
import { RAGEntity } from '@app/modules/rag/repository/entities/rag.entity';
import { InvitationEntity } from '@app/modules/invitation/repository/entities/invitation.entity';
import { RequestEntity } from '@app/modules/requests/repository/entities/requests.entity';
import { UsageEventEntity } from '@app/modules/knowledge-base/repository/entities/usage-event.entity';
import { WorkspaceUsageEntity } from '@app/modules/knowledge-base/repository/entities/workspace-usage.entity';
import { NotificationEntity } from '@app/modules/notification/repository/entities/notification.entity';
import { EntityName } from '@mikro-orm/core';

@Injectable()
export class WorkspaceOwnerService implements IWorkspaceOwnerService {
    private readonly logger = new Logger(WorkspaceOwnerService.name);

    private readonly invitationTokenSecret: string;
    private readonly invitationTokenExpired: StringValue;

    constructor(
        private readonly em: EntityManager,
        private readonly workSpaceRepository: WorkSpaceRepository,
        private readonly workspaceMemberRepository: WorkspaceMemberRepository,
        private readonly configService: ConfigService,
        private readonly helperHashService: HelperHashService,
        private readonly jwtService: JwtService,
        private readonly helperStringService: HelperStringService,
        private readonly helperAvatarService: HelperAvatarService,
        private readonly workspaceMemberService: WorkspaceMemberService,
        private readonly roleService: RoleService,
        private readonly invitationService: InvitationService,
        private readonly knowledgeBaseService: KnowledgeBaseService,
        @Optional()
        @Inject(WORKSPACE_CREATED_HOOK)
        private readonly createdHook: WorkspaceCreatedHook | undefined,
        private readonly customerTagService: CustomerTagService
    ) {
        this.invitationTokenSecret = this.configService.get<string>(
            'workspace.invitationKey'
        );
        this.invitationTokenExpired = this.configService.get<string>(
            'workspace.invitationExpired'
        ) as StringValue;
    }

    async getTotalByOwner(
        ownerId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ) {
        return this.workSpaceRepository.getTotal(
            {
                ...find,
                owner: ownerId,
            },
            {
                ...options,
            }
        );
    }

    async getListByOwner(
        ownerId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<WorkspaceEntity[]> {
        return this.workSpaceRepository.find<WorkspaceEntity>(
            {
                deleted: false,
                ...find,
                owner: ownerId,
            },
            {
                ...options,
            }
        );
    }

    findOneById(id: string, options?: Record<string, any>) {
        return this.workSpaceRepository.findOneById(id, {
            ...options,
        });
    }

    async generateInvitationLink(
        ownerId: string,
        { invitedEmail, roleId }: WorkSpaceInviteMemberRequestDto,
        url: string,
        workspace: WorkspaceEntity
    ) {
        // `workspace` is resolved and authorized by the caller (the
        // WorkspacePolicyGuard already checked the caller against this exact
        // :workspace), so there is no owner-only re-lookup here — an admin
        // with CREATE:MEMBER (not the owner) can invite too.

        // If roleId is provided, validate that it belongs to this workspace
        if (roleId) {
            const role = await this.roleService.findOne({
                id: roleId,
                workspace: workspace.id,
                isActive: true,
                type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            });

            if (!role) {
                throw new NotFoundException({
                    message:
                        'Role not found or does not belong to this workspace',
                });
            }

            // Check if it's an owner role and prevent assigning it via invitation
            const isOwnerRole = await this.roleService.isWorkspaceOwnerRole(
                roleId,
                workspace.id
            );

            if (isOwnerRole) {
                throw new NotFoundException({
                    message: 'Cannot assign owner role via invitation',
                });
            }
        }

        const payload: InvitationLinkPayload = {
            ownerId,
            workspaceId: workspace.id,
            invitedEmail,
            roleId,
        };
        const token = this.jwtService.sign(payload, {
            privateKey: this.invitationTokenSecret,
            expiresIn: this.invitationTokenExpired,
            algorithm: 'HS256',
        });
        return `${url}/join?tokens=${token}`;
    }

    async generateInvitationLinkWithDetails(
        ownerId: string,
        { invitedEmail, roleId }: WorkSpaceInviteMemberRequestDto,
        url: string,
        workspace: WorkspaceEntity
    ): Promise<{
        invitationLink: string;
        token: string;
        expiresAt: Date;
        workspaceId: string;
    }> {
        // `workspace` is resolved and authorized by the caller (see
        // generateInvitationLink above) — no owner-only re-lookup here.

        // Check if there's already a pending invitation for this email
        const existingInvitation =
            await this.invitationService.checkExistingInvitation(
                workspace.id,
                invitedEmail
            );

        if (existingInvitation) {
            // Rebuild the link from the configured url + the stored token —
            // never trust the persisted invitationLink column. Pre-fix rows
            // may have been built from an attacker-controlled Origin header,
            // and returning that stored value here would still email it out.
            return {
                invitationLink: `${url}/join?tokens=${existingInvitation.token}`,
                token: existingInvitation.token,
                expiresAt: existingInvitation.expiresAt,
                workspaceId: workspace.id,
            };
        }

        // If roleId is provided, validate that it belongs to this workspace
        let role: RoleEntity;
        if (!!roleId && roleId.length > 0) {
            role = await this.roleService.findOne({
                id: roleId,
                workspace: workspace.id,
                isActive: true,
            });

            if (!role) {
                throw new NotFoundException({
                    message:
                        'Role not found or does not belong to this workspace',
                });
            }

            // Check if it's an owner role and prevent assigning it via invitation
            const isOwnerRole = await this.roleService.isWorkspaceOwnerRole(
                roleId,
                workspace.id
            );

            if (isOwnerRole) {
                throw new NotFoundException({
                    message: 'Cannot assign owner role via invitation',
                });
            }
        } else {
            role = await this.roleService.findOne({
                workspace: workspace.id,
                isActive: true,
                type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            });
        }

        const payload: InvitationLinkPayload = {
            ownerId,
            workspaceId: workspace.id,
            invitedEmail,
            roleId,
        };
        const token = this.jwtService.sign(payload, {
            privateKey: this.invitationTokenSecret,
            expiresIn: this.invitationTokenExpired,
            algorithm: 'HS256',
        });

        // Parse expiration time
        const expirationTime = this.invitationTokenExpired;
        const expirationMs = this.parseExpiration(expirationTime);
        const expiresAt = new Date(Date.now() + expirationMs);

        const invitationLink = `${url}/join?tokens=${token}`;

        // Save invitation to database
        await this.invitationService.create({
            workspace: workspace.id,
            user: ownerId,
            email: invitedEmail.toLowerCase(),
            role: role.id,
            token,
            expiresAt,
            invitationLink,
        });

        return {
            invitationLink,
            token,
            expiresAt,
            workspaceId: workspace.id,
        };
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

    async create(
        owner: UserEntity,
        data: WorkSpaceCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<WorkspaceEntity> {
        const { name, image } = data;
        const em = options?.em || this.em;

        const entity = new WorkspaceEntity();
        entity.name = name;
        entity.slug = slugify(name);
        entity.avatar =
            image ||
            this.helperAvatarService.generateWorkspaceAvatar(entity.slug);
        entity.owner = em.getReference(UserEntity, owner.id);
        entity.invitationCode = this.helperStringService.random(
            WORKSPACE_INVITATION_CODE_LENGTH
        );

        // Use transaction to ensure workspace creation and owner role assignment are atomic.
        // `session.begin()` is async (Promise<void>) — without await, the
        // transaction never actually opens before the try block runs, so
        // every later commit/rollback throws "An open transaction is required".
        const session = em.fork();
        await session.begin();
        try {
            // Create workspace
            const workspace =
                await this.workSpaceRepository.create<WorkspaceEntity>(entity, {
                    ...options,
                    em: session,
                });

            // Create owner role for the workspace
            const ownerRole = await this.roleService.createWorkspaceOwnerRole(
                workspace,
                { em: session }
            );

            // Create based role for the workspace
            const _memberRoles = await this.roleService.createManyWithWorkspace(
                WORKSPACE_DEFAULT_MEMBER_ROLES,
                workspace,
                { em: session }
            );

            // Add owner role to user's workspace roles using WorkspaceMember entity
            await this.createActiveMembership(
                workspace,
                owner.id,
                ownerRole.id,
                em,
                session
            );

            // Inside the transaction on purpose: in Ecbot Cloud the hook puts
            // the workspace on the default plan, and one created without it is
            // chatbot-dead. Absent in the public build — nothing to assign.
            await this.createdHook?.onWorkspaceCreated(workspace, owner, {
                em: session,
            });

            // Create default knowledge base for the workspace
            await this.knowledgeBaseService.create(
                {
                    workspace: workspace.id,
                    name: `${workspace.name} Knowledge Base`,
                    description: 'Default knowledge base for workspace',
                },
                { em: session }
            );

            // Seed default customer tags catalog for the workspace
            for (const tag of CUSTOMER_TAG_DEFAULTS) {
                await this.customerTagService.create(
                    {
                        workspace: workspace.id,
                        name: tag.name,
                        emoji: tag.emoji,
                        description: tag.description,
                        triggersHandoff: tag.triggersHandoff,
                    },
                    { em: session }
                );
            }

            await session.commit();

            // After the commit, so nothing it writes survives a rollback — and
            // never fatal: the workspace exists whatever the follow-up does.
            try {
                await this.createdHook?.afterWorkspaceCreated(workspace, owner);
            } catch (error) {
                this.logger.error(
                    `Workspace-created follow-up failed for workspace ${workspace.id}: ${error}`
                );
            }

            return workspace;
        } catch (error) {
            // The transaction was opened on `session` (the fork), not on `em`.
            // Calling rollback on `em` raised "An open transaction is
            // required for this operation" and masked the underlying error.
            console.error(
                'Error creating workspace, rolling back transaction',
                error
            );
            await session.rollback();

            // Translate DB-level unique-constraint violations into a domain
            // 409 so the FE gets a meaningful error code instead of a
            // generic 500 from the global filter.
            if (this.isUniqueConstraintViolation(error)) {
                throw new ConflictException({
                    statusCode:
                        ENUM_WORKSPACE_STATUS_CODE_ERROR.WORKSPACE_EXIST,
                    message: 'workspace.error.exist',
                });
            }

            throw error;
        }
    }

    /**
     * MikroORM v6 surfaces unique-constraint violations as
     * `UniqueConstraintViolationException`. The underlying Postgres error
     * (`23505`) is also kept on the `code` field, so we accept either signal
     * — that way a driver upgrade or a thrown error without the wrapper
     * class still gets translated.
     */
    private isUniqueConstraintViolation(error: unknown): boolean {
        if (error instanceof UniqueConstraintViolationException) {
            return true;
        }
        const code = (error as { code?: string } | null)?.code;
        return code === '23505';
    }

    /**
     * Builds an active WorkspaceMemberEntity linking `userId` to `workspace`
     * under `roleId` and persists it. References are resolved through
     * `referenceEm` (so a caller inside a transaction can still point at
     * entities managed by the outer EntityManager); the write itself goes
     * through `persistEm`. Shared by create() and addMemberToWorkspace().
     */
    private async createActiveMembership(
        workspace: WorkspaceEntity,
        userId: string,
        roleId: string,
        referenceEm: EntityManager,
        persistEm: EntityManager
    ): Promise<void> {
        const membership = new WorkspaceMemberEntity();
        membership.workspace = referenceEm.getReference(
            WorkspaceEntity,
            workspace.id
        );
        membership.user = referenceEm.getReference(UserEntity, userId);
        membership.role = referenceEm.getReference(RoleEntity, roleId);
        membership.joinedAt = new Date();
        membership.isActive = true;

        await this.workspaceMemberRepository.create(membership, {
            em: persistEm,
        });
    }

    /**
     * Workspace-scoped entities that are cascade soft-deleted alongside the
     * workspace. Each extends DatabaseEntityBase (has deleted/deletedAt/
     * deletedBy) and references the workspace via a `workspace` FK.
     *
     * ActivityEntity is intentionally excluded — it is the audit trail and
     * must survive (including the DELETE activity we log for this op).
     */
    private static readonly WORKSPACE_CHILD_ENTITIES: EntityName<any>[] = [
        WorkspaceMemberEntity,
        RoleEntity,
        ChatbotEntity,
        AccountEntity,
        CustomerEntity,
        ContactPointEntity,
        CustomerTagEntity,
        KnowledgeBaseEntity,
        RAGEntity,
        InvitationEntity,
        RequestEntity,
        UsageEventEntity,
        WorkspaceUsageEntity,
        NotificationEntity,
    ];

    async delete(workspace: WorkspaceEntity, userId: string): Promise<void> {
        const softDeleteData = {
            deleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
        };

        // Atomically cascade the soft-delete. `session.begin()` is async — it
        // must be awaited or the transaction never opens (see create()).
        const session = this.em.fork();
        await session.begin();
        try {
            for (const Entity of WorkspaceOwnerService.WORKSPACE_CHILD_ENTITIES) {
                await session.nativeUpdate(
                    Entity,
                    { workspace: workspace.id },
                    softDeleteData
                );
            }

            await session.nativeUpdate(
                WorkspaceEntity,
                { id: workspace.id },
                softDeleteData
            );

            await session.commit();
        } catch (error) {
            await session.rollback();
            throw error;
        }
    }

    async addMemberToWorkspace(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceEntity> {
        const workspace =
            await this.workSpaceRepository.findOne<WorkspaceEntity>({
                id: workspaceId,
            });
        const activeMembers =
            await this.workspaceMemberRepository.findActiveByWorkspace(
                workspace.id
            );

        // No active-member list → nothing to do.
        if (!activeMembers) {
            return;
        }

        const isAlreadyMember = activeMembers.some(
            member => member.user.id === userId
        );
        if (isAlreadyMember) {
            return workspace;
        }

        const memberRole = await this.roleService.findOne({
            workspace: workspace.id,
            type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            isActive: true,
        });
        await this.createActiveMembership(
            workspace,
            userId,
            memberRole.id,
            this.em,
            this.em
        );

        return workspace;
    }

    async update(
        workspace: WorkspaceEntity,
        data: WorkSpaceUpdateRequestDto,
        options?: IDatabaseUpdateOptions
    ) {
        const { name, image, slug } = data;
        workspace.name = name;
        workspace.avatar = image || '';
        workspace.slug = slug;
        return this.workSpaceRepository.updateEntity(
            { id: workspace.id },
            workspace,
            options
        );
    }

    async checkUserIsOwnerAsync(
        userId: string,
        identifier: {
            workspaceId?: string;
            slug?: string;
            invitationCode?: string;
        }
    ): Promise<boolean> {
        const query: Record<string, string> = { owner: userId };

        if (identifier.workspaceId) query.id = identifier.workspaceId;
        else if (identifier.slug) query.slug = identifier.slug;
        else if (identifier.invitationCode)
            query.invitationCode = identifier.invitationCode;
        else return false;

        const workspace =
            await this.workSpaceRepository.findOne<WorkspaceEntity>(query);

        return !!workspace;
    }
    checkUserIsOwner(user: UserEntity, workspace: WorkspaceEntity): boolean {
        return (
            workspace.owner.id.toString().toLowerCase() ===
            user.id.toString().toLowerCase()
        );
    }
    mapList(workspaces: WorkspaceEntity[]): WorkSpaceListResponseDto[] {
        return plainToInstance(WorkSpaceListResponseDto, workspaces);
    }

    mapGet(workspace: WorkspaceEntity): WorkSpaceGetResponseDto {
        return plainToInstance(WorkSpaceGetResponseDto, workspace);
    }

    async findOneByIdOrSlug(
        idOrSlug: string,
        options?: IDatabaseFindOneOptions
    ): Promise<WorkspaceEntity | null> {
        const isUUID = this.helperHashService.isUUID(idOrSlug);
        const workspace = await this.workSpaceRepository.findOne(
            {
                [isUUID ? 'id' : 'slug']: idOrSlug,
            },
            {
                ...options,
                populate: ['owner', ...(options?.populate || [])],
            }
        );
        return (workspace as any) ?? null;
    }

    async removeMemberFromWorkspace(
        workspace: WorkspaceEntity,
        member: UserEntity
    ) {
        await this.detachMember(workspace.id, member.id);

        // Refresh the workspace to get updated members array
        return this.workSpaceRepository.findOneById(workspace.id);
    }

    // Deactivates all of the user's memberships in the workspace.
    private detachMember(workspaceId: string, userId: string): Promise<void> {
        return this.workspaceMemberService.removeUserFromWorkspace(
            workspaceId,
            userId
        );
    }
}

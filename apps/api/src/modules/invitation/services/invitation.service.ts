import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@app/common/database/interfaces/database.interface';
import { ENUM_PAGINATION_ORDER_DIRECTION_TYPE } from '@app/common/pagination/enums/pagination.enum';
import { RoleEntity } from '@app/modules/role/repository/entities/role.entity';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreateInvitationRequestDto } from '../dtos/request/invitation.create.request.dto';
import { InvitationDetailResponseDto } from '../dtos/response/invitation-detail.response.dto';
import { InvitationListResponseDto } from '../dtos/response/invitation-list.response.dto';
import {
    ENUM_INVITATION_STATUS,
    ENUM_INVITATION_STATUS_CODE_ERROR,
} from '../enums/invitation.enum';
import { IInvitationService } from '../interfaces/invitation.interface';
import { InvitationEntity } from '../repository/entities/invitation.entity';
import { InvitationRepository } from '../repository/repositories/invitation.repository';

@Injectable()
export class InvitationService implements IInvitationService {
    constructor(private readonly invitationRepository: InvitationRepository) {}

    async findOneById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity> {
        const invitation = await this.invitationRepository.findOneById(
            id,
            options
        );

        if (!invitation) {
            throw new NotFoundException({
                statusCode: ENUM_INVITATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'invitation.error.notFound',
            });
        }

        return invitation;
    }

    async findOneByToken(
        token: string,
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity> {
        const invitation = await this.invitationRepository.findOne(
            { token },
            options
        );

        if (!invitation) {
            throw new NotFoundException({
                statusCode: ENUM_INVITATION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'invitation.error.notFound',
            });
        }

        return invitation;
    }

    async findByWorkspace(
        workspace: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<InvitationEntity[]> {
        return this.invitationRepository.find(
            { ...find, workspace },
            {
                order: { createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC },
                ...options,
            }
        );
    }

    async findByInviter(
        inviter: string,
        options?: IDatabaseFindAllOptions
    ): Promise<InvitationEntity[]> {
        return this.invitationRepository.find(
            { inviter },
            {
                order: { createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC },
                ...options,
            }
        );
    }

    async findByEmail(
        email: string,
        options?: IDatabaseFindAllOptions
    ): Promise<InvitationEntity[]> {
        return this.invitationRepository.find(
            { inviteeEmail: email.toLowerCase() },
            {
                order: { createdAt: ENUM_PAGINATION_ORDER_DIRECTION_TYPE.DESC },
                ...options,
            }
        );
    }

    async create(
        data: CreateInvitationRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<InvitationEntity> {
        const entity = new InvitationEntity();
        const em = this.invitationRepository.getEntityManager();
        entity.workspace = em.getReference(WorkspaceEntity, data.workspace);
        entity.inviter = em.getReference(UserEntity, data.user);
        entity.inviteeEmail = data.email.toLowerCase();
        entity.role = em.getReference(RoleEntity, data.role);
        entity.token = data.token;
        entity.expiresAt = data.expiresAt;
        entity.invitationLink = data.invitationLink;
        entity.status = ENUM_INVITATION_STATUS.PENDING;

        return this.invitationRepository.create<InvitationEntity>(
            entity,
            options
        );
    }

    async updateStatus(
        id: string,
        status: ENUM_INVITATION_STATUS,
        metadata?: {
            acceptedByUserId?: string;
            revokedByUserId?: string;
        },
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity> {
        const updateData: any = { status };

        if (
            status === ENUM_INVITATION_STATUS.ACCEPTED &&
            metadata?.acceptedByUserId
        ) {
            updateData.acceptedAt = new Date();
            updateData.acceptedByUserId = metadata.acceptedByUserId;
        }

        if (
            status === ENUM_INVITATION_STATUS.REVOKED &&
            metadata?.revokedByUserId
        ) {
            updateData.revokedAt = new Date();
            updateData.revokedByUserId = metadata.revokedByUserId;
        }

        return this.invitationRepository.updateEntity(
            { id: id },
            updateData,
            options
        );
    }

    async revoke(
        id: string,
        revokedByUserId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity> {
        return this.updateStatus(
            id,
            ENUM_INVITATION_STATUS.REVOKED,
            { revokedByUserId },
            options
        );
    }

    async accept(
        id: string,
        acceptedByUserId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity> {
        return this.updateStatus(
            id,
            ENUM_INVITATION_STATUS.ACCEPTED,
            { acceptedByUserId },
            options
        );
    }

    async getTotalByWorkspace(workspaceId: string): Promise<number> {
        return this.invitationRepository.getTotal({ workspace: workspaceId });
    }

    async deleteMany(
        find: Record<string, any>,
        options?: IDatabaseCreateOptions
    ): Promise<boolean> {
        const result = await this.invitationRepository.deleteMany(
            find,
            options
        );
        return result.length > 0;
    }

    async updateRole(
        id: string,
        roleId?: string,
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity> {
        return this.invitationRepository.updateEntity(
            { id: id },
            { roleId } as any,
            options
        );
    }

    async regenerateToken(
        id: string,
        newToken: string,
        newExpiresAt: Date,
        newInvitationLink: string,
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity> {
        return this.invitationRepository.updateEntity(
            { id: id },
            {
                token: newToken,
                expiresAt: newExpiresAt,
                invitationLink: newInvitationLink,
                status: ENUM_INVITATION_STATUS.PENDING, // Reset status to pending
            } as any,
            options
        );
    }

    async mapList(
        invitations: InvitationEntity[]
    ): Promise<InvitationListResponseDto[]> {
        return plainToInstance(InvitationListResponseDto, invitations, {
            excludeExtraneousValues: true,
        });
    }

    async mapDetail(
        invitation: InvitationEntity
    ): Promise<InvitationDetailResponseDto> {
        return plainToInstance(InvitationDetailResponseDto, invitation, {
            excludeExtraneousValues: true,
        });
    }

    async checkExistingInvitation(
        workspaceId: string,
        inviteeEmail: string
    ): Promise<InvitationEntity | null> {
        return this.invitationRepository.findOne({
            workspace: workspaceId,
            inviteeEmail: inviteeEmail.toLowerCase(),
            status: ENUM_INVITATION_STATUS.PENDING,
        });
    }
}

import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
} from '@app/common/database/interfaces/database.interface';
import { CreateInvitationRequestDto } from '../dtos/request/invitation.create.request.dto';
import { ENUM_INVITATION_STATUS } from '../enums/invitation.enum';
import { InvitationEntity } from '../repository/entities/invitation.entity';

export interface IInvitationService {
    findOneById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity>;

    findOneByToken(
        token: string,
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity>;

    findByWorkspace(
        workspaceId: string,
        options?: IDatabaseFindAllOptions
    ): Promise<InvitationEntity[]>;

    findByInviter(
        inviterId: string,
        options?: IDatabaseFindAllOptions
    ): Promise<InvitationEntity[]>;

    findByEmail(
        email: string,
        options?: IDatabaseFindAllOptions
    ): Promise<InvitationEntity[]>;

    create(
        data: CreateInvitationRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<InvitationEntity>;

    updateStatus(
        id: string,
        status: ENUM_INVITATION_STATUS,
        metadata?: {
            acceptedByUserId?: string;
            revokedByUserId?: string;
        },
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity>;

    revoke(
        id: string,
        revokedByUserId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity>;

    accept(
        id: string,
        acceptedByUserId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<InvitationEntity>;

    getTotalByWorkspace(workspaceId: string): Promise<number>;

    deleteMany(
        find: Record<string, any>,
        options?: IDatabaseCreateOptions
    ): Promise<boolean>;
}

import {
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
} from '@app/common/database/interfaces/database.interface';
import { RoleEntity } from '@app/modules/role/repository/entities/role.entity';
import { WorkspaceMemberEntity } from '../repository/entities/workspace-member.entity';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';
import { IWorkspaceMemberWithUserDoc } from './workspace-member.interface';
import { InvitationLinkPayload } from './workspace.interface';

// The decoded invitation JWT: the invite payload plus the claims jsonwebtoken adds.
export type DecodedInvitationToken = InvitationLinkPayload & {
    iat: number;
    exp: number;
};

// Nullable membership lookups (getMembershipDetails, getWorkspaceMemberByUserId)
// share this shape.
export type WorkspaceMembershipOrNull = WorkspaceMemberEntity | null;

export interface IWorkspaceMemberService {
    verifyInvitationToken(token: string): Promise<DecodedInvitationToken>;
    joinWorkspace(
        workspaceId: string,
        userId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<WorkspaceEntity>;
    findWorkspaceByInvitationCode(
        invitationCode: string
    ): Promise<WorkspaceEntity>;
    assignRoleToMember(
        workspaceId: string,
        userId: string,
        roleId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<void>;
    removeRoleFromMember(
        workspaceId: string,
        userId: string,
        roleId: string
    ): Promise<void>;
    getMemberWorkspaceRoles(
        workspaceId: string,
        userId: string
    ): Promise<RoleEntity[]>;
    removeUserFromWorkspace(
        workspaceId: string,
        memberUserId: string
    ): Promise<void>;
    hasUserRole(
        workspaceId: string,
        userId: string,
        roleId: string
    ): Promise<boolean>;
    getUserWorkspaces(memberUserId: string): Promise<string[]>;
    getMembershipDetails(
        workspaceId: string,
        userId: string
    ): Promise<WorkspaceMembershipOrNull>;
    joinWorkspaceViaInvitation(
        token: string,
        userId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<{
        workspace: WorkspaceEntity;
        roleId?: string;
    }>;
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IWorkspaceMemberWithUserDoc[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<WorkspaceMemberEntity>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<WorkspaceMemberEntity>;
}

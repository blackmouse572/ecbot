import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkspaceMemberEntity } from '../repository/entities/workspace-member.entity';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';

export type IWorkspaceMemberDoc = Omit<
    WorkspaceMemberEntity,
    'workspace' | 'user'
> & {
    workspace: WorkspaceEntity;
    user: UserEntity;
};

export type IWorkspaceMemberWithUserDoc = Omit<IWorkspaceMemberDoc, 'user'> & {
    user: UserEntity;
};

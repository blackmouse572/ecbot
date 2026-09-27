import {
    IDatabaseCreateOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseUpdateOptions,
} from '@app/common/database/interfaces/database.interface';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { WorkSpaceCreateRequestDto } from '../dtos/request/workspace.create.request';
import { WorkSpaceUpdateRequestDto } from '../dtos/request/workspace.update.request';
import { WorkspaceEntity } from '../repository/entities/workspace.entity';

export interface IWorkspaceOwnerService {
    getTotalByOwner(
        ownerId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<number>;

    getListByOwner(
        ownerId: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<WorkspaceEntity[]>;

    findOneById(
        workSpaceId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<WorkspaceEntity | null>;

    findOneByIdOrSlug(
        workSpaceId: string,
        options?: IDatabaseFindOneOptions
    ): Promise<WorkspaceEntity | null>;

    create(
        owner: UserEntity,
        data: WorkSpaceCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<WorkspaceEntity>;

    update(
        workspace: WorkspaceEntity,
        data: WorkSpaceUpdateRequestDto,
        options?: IDatabaseUpdateOptions
    ): Promise<WorkspaceEntity>;

    delete(workspace: WorkspaceEntity, userId: string): Promise<void>;
}

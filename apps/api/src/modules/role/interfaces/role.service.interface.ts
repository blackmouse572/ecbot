import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import {
    IDatabaseCreateManyOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseDeleteOptions,
    IDatabaseExistsOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { RoleCreateRequestDto } from 'src/modules/role/dtos/request/role.create.request.dto';
import {
    RoleUpdateRequestDto,
    RoleUpdateWorkspaceRequestDto,
} from 'src/modules/role/dtos/request/role.update.request.dto';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import { RoleShortResponseDto } from 'src/modules/role/dtos/response/role.short.response.dto';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

export interface IRoleService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleEntity[]>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findAllActive(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleEntity[]>;
    getTotalActive(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    findAllActiveByType(
        type: ENUM_POLICY_ROLE_TYPE,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleEntity[]>;
    findAllByTypes(
        types: ENUM_POLICY_ROLE_TYPE[],
        options?: IDatabaseFindAllOptions
    ): Promise<RoleEntity[]>;
    findOneById(_id: string, options?: IDatabaseOptions): Promise<RoleEntity>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<RoleEntity>;
    findOneByName(
        name: string,
        options?: IDatabaseOptions
    ): Promise<RoleEntity>;
    findOneActiveById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<RoleEntity>;
    existByName(
        name: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean>;
    existByNameAndWorkspace(
        name: string,
        workspace: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean>;
    create(
        { name, description, type, permissions }: RoleCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity>;
    createWithWorkspace(
        { description, permissions }: RoleUpdateWorkspaceRequestDto,
        workspace: WorkspaceEntity,
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity>;
    update(
        repository: RoleEntity,
        { permissions, type, description }: RoleUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<RoleEntity>;
    updateWithWorkspace(
        repository: RoleEntity,
        { permissions, description }: RoleUpdateWorkspaceRequestDto,
        workspace: WorkspaceEntity,
        options?: IDatabaseSaveOptions
    ): Promise<RoleEntity>;
    active(
        repository: RoleEntity,
        options?: IDatabaseSaveOptions
    ): Promise<RoleEntity>;
    inactive(
        repository: RoleEntity,
        options?: IDatabaseSaveOptions
    ): Promise<RoleEntity>;
    delete(
        repository: RoleEntity,
        options?: IDatabaseDeleteOptions
    ): Promise<boolean>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
    createMany(
        data: RoleCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean>;
    mapList(roles: RoleEntity[] | RoleEntity[]): RoleListResponseDto[];
    mapGet(role: RoleEntity | RoleEntity): RoleGetResponseDto;
    mapShort(roles: RoleEntity[] | RoleEntity[]): RoleShortResponseDto[];
}

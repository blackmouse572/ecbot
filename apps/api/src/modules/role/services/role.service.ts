import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { classToPlain, plainToInstance } from 'class-transformer';
import { DatabaseHelperQueryContain } from 'src/common/database/decorators/database.decorator';
import {
    IDatabaseCreateManyOptions,
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseDeleteOptions,
    IDatabaseExistsOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
    IDatabaseSaveOptions,
} from 'src/common/database/interfaces/database.interface';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { RoleCreateRequestDto } from 'src/modules/role/dtos/request/role.create.request.dto';
import {
    RoleUpdateRequestDto,
    RoleUpdateWorkspaceRequestDto,
} from 'src/modules/role/dtos/request/role.update.request.dto';
import { RoleGetResponseDto } from 'src/modules/role/dtos/response/role.get.response.dto';
import { RoleListResponseDto } from 'src/modules/role/dtos/response/role.list.response.dto';
import { RoleShortResponseDto } from 'src/modules/role/dtos/response/role.short.response.dto';
import { IRoleService } from 'src/modules/role/interfaces/role.service.interface';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { RoleRepository } from 'src/modules/role/repository/repositories/role.repository';
import { ALLOWED_WORKSPACE_POLICY_SUBJECT } from '../constants/role.list.constant';

@Injectable()
export class RoleService implements IRoleService {
    constructor(
        private readonly roleRepository: RoleRepository,
        private readonly em: EntityManager
    ) {}

    existByNameAndWorkspace(
        name: string,
        workspace: string,
        _options?: IDatabaseExistsOptions
    ): Promise<boolean> {
        return this.roleRepository.exists({
            $and: [
                DatabaseHelperQueryContain('name', name, {
                    fullWord: true,
                }),
                { workspace },
            ],
        });
    }

    async createWithWorkspace(
        { name, description, type, permissions }: RoleCreateRequestDto,
        workspace: WorkspaceEntity,
        _options?: IDatabaseCreateOptions
    ): Promise<RoleEntity> {
        const em = _options?.em || this.em;
        const create = em.create(RoleEntity, {
            name,
            description,
            type,
            permissions: permissions.map(p => ({
                subject: p.subject,
                action: p.action,
            })),
            isActive: true,
            workspace: this.em.getReference(WorkspaceEntity, workspace.id),
        });

        await em.persist(create).flush();
        return create;
    }

    async createManyWithWorkspace(
        roles: RoleCreateRequestDto[],
        workspace: WorkspaceEntity,
        _options?: IDatabaseCreateManyOptions
    ): Promise<RoleEntity[]> {
        const creates = roles.map(role =>
            this.em.create(RoleEntity, {
                name: role.name,
                description: role.description,
                type: role.type,
                permissions: role.permissions.map(p => ({
                    subject: p.subject,
                    action: p.action,
                })),
                isActive: true,
                workspace,
            })
        );

        return creates;
    }

    async createWorkspaceOwnerRole(
        workspace: WorkspaceEntity,
        _options?: IDatabaseCreateOptions
    ): Promise<RoleEntity> {
        const ownerPermissions = ALLOWED_WORKSPACE_POLICY_SUBJECT.map(
            subject => ({
                subject,
                action: [ENUM_POLICY_ACTION.MANAGE], // MANAGE includes all actions
            })
        );

        return this.em.create(RoleEntity, {
            name: `Owner - ${workspace.name}`,
            description: `Owner role for ${workspace.name} workspace with full permissions`,
            type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER,
            permissions: ownerPermissions,
            isActive: true,
            workspace,
        });
    }

    async isWorkspaceOwnerRole(
        roleId: string,
        workspaceId: string
    ): Promise<boolean> {
        const role = await this.roleRepository.findOne({
            id: roleId,
            workspace: workspaceId,
        });

        if (!role) return false;

        // Check if this role has MANAGE permission for WORKSPACE subject
        const hasWorkspaceManage = role.permissions.some(
            permission =>
                permission.subject === ENUM_POLICY_SUBJECT.WORKSPACE &&
                permission.action.includes(ENUM_POLICY_ACTION.MANAGE)
        );

        // Check if this role has all allowed workspace permissions
        const hasAllPermissions = ALLOWED_WORKSPACE_POLICY_SUBJECT.every(
            subject =>
                role.permissions.some(
                    permission =>
                        permission.subject === subject &&
                        permission.action.includes(ENUM_POLICY_ACTION.MANAGE)
                )
        );

        return hasWorkspaceManage && hasAllPermissions;
    }

    updateWithWorkspace(
        repository: RoleEntity,
        { permissions, description }: RoleUpdateWorkspaceRequestDto,
        workspace: WorkspaceEntity,
        options?: IDatabaseSaveOptions
    ): Promise<RoleEntity> {
        repository.permissions = permissions;
        repository.description = description;
        repository.workspace = workspace;

        return this.roleRepository.save(repository, options);
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleEntity[]> {
        return this.roleRepository.find(find, options);
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.roleRepository.getTotal(find, options);
    }

    async findAllActive(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleEntity[]> {
        return this.roleRepository.find({ ...find, isActive: true }, options);
    }

    async getTotalActive(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.roleRepository.getTotal(
            { ...find, isActive: true },
            options
        );
    }

    async findAllActiveByType(
        type: ENUM_POLICY_ROLE_TYPE,
        options?: IDatabaseFindAllOptions
    ): Promise<RoleEntity[]> {
        return this.roleRepository.find({ type, isActive: true }, options);
    }

    async findAllByTypes(
        types: ENUM_POLICY_ROLE_TYPE[],
        options?: IDatabaseFindAllOptions
    ): Promise<RoleEntity[]> {
        return this.roleRepository.find(
            {
                type: {
                    $in: types,
                },
            },
            options
        );
    }

    async findOneById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleEntity | null> {
        return this.roleRepository.findOneById(id, options);
    }

    async findOne(
        find: Record<string, any>,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleEntity | null> {
        return this.roleRepository.findOne(find, options);
    }

    async findOneByName(
        name: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleEntity | null> {
        return this.roleRepository.findOne(
            {
                name: {
                    $like: `%${name}%`,
                },
            },
            options
        );
    }

    async findOneActiveById(
        id: string,
        options?: IDatabaseFindOneOptions
    ): Promise<RoleEntity | null> {
        return this.roleRepository.findOne({ id, isActive: true }, options);
    }

    async existByName(
        name: string,
        options?: IDatabaseExistsOptions
    ): Promise<boolean> {
        return this.roleRepository.exists(
            DatabaseHelperQueryContain('name', name, { fullWord: true }),
            options
        );
    }

    async create(
        { name, description, type, permissions }: RoleCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<RoleEntity> {
        return this.roleRepository.create(
            {
                name,
                description,
                type,
                permissions: permissions.map(p => ({
                    subject: p.subject,
                    action: p.action,
                })),
                isActive: true,
            },
            options
        );
    }

    async update(
        repository: RoleEntity,
        { permissions, type, description }: Partial<RoleUpdateRequestDto>,
        options?: IDatabaseSaveOptions
    ): Promise<RoleEntity> {
        if (description !== undefined) repository.description = description;
        if (type !== undefined) repository.type = type;
        if (permissions !== undefined) repository.permissions = permissions;

        return this.roleRepository.save(repository, options);
    }

    async active(
        repository: RoleEntity,
        options?: IDatabaseSaveOptions
    ): Promise<RoleEntity> {
        repository.isActive = true;

        return this.roleRepository.save(repository, options);
    }

    async inactive(
        repository: RoleEntity,
        options?: IDatabaseSaveOptions
    ): Promise<RoleEntity> {
        repository.isActive = false;

        return this.roleRepository.save(repository, options);
    }

    async delete(
        repository: RoleEntity,
        options?: IDatabaseDeleteOptions
    ): Promise<boolean> {
        await this.roleRepository.delete(
            {
                id: repository.id,
            },
            options
        );

        return true;
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.roleRepository.deleteMany(find, options);

        return true;
    }

    async createMany(
        data: RoleCreateRequestDto[],
        options?: IDatabaseCreateManyOptions
    ): Promise<boolean> {
        const entities = data.map(
            ({ type, name, permissions, description }) => ({
                type,
                isActive: true,
                name,
                permissions: permissions.map(p => ({
                    subject: p.subject,
                    action: p.action,
                })),
                description,
            })
        );

        await this.roleRepository.createMany(entities, options);

        return true;
    }

    mapList(roles: RoleEntity[]): RoleListResponseDto[] {
        return plainToInstance(RoleListResponseDto, roles, {
            excludeExtraneousValues: true,
        });
    }

    mapGet(role: RoleEntity): RoleGetResponseDto {
        return plainToInstance(RoleGetResponseDto, role, {
            excludeExtraneousValues: true,
        });
    }

    mapShort(roles: RoleEntity[]): RoleShortResponseDto[] {
        return plainToInstance(RoleShortResponseDto, roles, {
            excludeExtraneousValues: true,
        });
    }
}

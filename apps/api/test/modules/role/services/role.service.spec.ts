import { EntityManager } from '@mikro-orm/postgresql';
import { RoleCreateRequestDto } from '@app/modules/role/dtos/request/role.create.request.dto';
import { randomUUID } from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { RoleEntity } from '../../../../src/modules/role/repository/entities/role.entity';
import { RoleRepository } from '../../../../src/modules/role/repository/repositories/role.repository';
import { RoleService } from '../../../../src/modules/role/services/role.service';
import { ALLOWED_WORKSPACE_POLICY_SUBJECT } from '../../../../src/modules/role/constants/role.list.constant';
import { mockRole, rolesMock } from '../mocks/roles.mock';

describe('RoleService', () => {
    let service: RoleService;
    let em: {
        create: jest.Mock;
        persist: jest.Mock;
        flush: jest.Mock;
        getReference: jest.Mock;
    };

    const mockRoleRepository = {
        find: jest.fn(),
        getTotal: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        exists: jest.fn(),
        findOneById: jest.fn(),
        createMany: jest.fn(),
    };

    const mockEntityManager = {
        flush: jest.fn().mockResolvedValue(undefined),
        persist: jest.fn().mockReturnThis(),
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
        getReference: jest.fn().mockReturnValue({}),
        create: jest.fn((_, data) => data),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoleService,
                {
                    provide: RoleRepository,
                    useValue: mockRoleRepository,
                },
                {
                    provide: EntityManager,
                    useValue: mockEntityManager,
                },
            ],
        }).compile();

        service = module.get<RoleService>(RoleService);
        em = module.get(EntityManager) as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findAll', () => {
        it('should return all roles with pagination', async () => {
            const find = { isActive: true };
            const options = {
                paging: { limit: 10, offset: 0 },
                order: { createdAt: 'desc' },
                join: true,
            };

            mockRoleRepository.find.mockResolvedValue(rolesMock);
            mockRoleRepository.getTotal.mockResolvedValue(1);

            const result = await service.findAll(find, options as any);

            expect(result).toEqual(rolesMock);
            expect(mockRoleRepository.find).toHaveBeenCalledWith(
                find,
                expect.objectContaining({
                    paging: { limit: 10, offset: 0 },
                    join: true,
                })
            );
        });
    });

    describe('findAllActive', () => {
        it('should return all active roles', async () => {
            const find = { isActive: true };
            mockRoleRepository.find.mockResolvedValue(
                rolesMock.filter(role => role.isActive)
            );

            const result = await service.findAllActive(find);

            expect(result).toHaveLength(2);
            expect(mockRoleRepository.find).toHaveBeenCalledWith(
                { ...find, isActive: true },
                undefined
            );
        });
    });

    describe('getTotal', () => {
        it('should return total count of roles', async () => {
            const find = { isActive: true };
            mockRoleRepository.getTotal.mockResolvedValue(5);

            const result = await service.getTotal(find);

            expect(result).toBe(5);
            expect(mockRoleRepository.getTotal).toHaveBeenCalledWith(
                find,
                undefined
            );
        });
    });

    describe('getTotalActive', () => {
        it('should return total count of active roles', async () => {
            const find = { isActive: true };
            mockRoleRepository.getTotal.mockResolvedValue(
                rolesMock.filter(role => role.isActive).length
            );

            const result = await service.getTotalActive(find);

            expect(result).toBe(2);
            expect(mockRoleRepository.getTotal).toHaveBeenCalledWith(
                find,
                undefined
            );
        });
    });

    describe('findOneById', () => {
        it('should return a role by id', async () => {
            const id = randomUUID();
            mockRoleRepository.findOneById.mockResolvedValue(mockRole);

            const result = await service.findOneById(id);

            expect(result).toEqual(mockRole);
            expect(mockRoleRepository.findOneById).toHaveBeenCalledWith(
                id,
                undefined
            );
        });
    });

    describe('findOneActiveById', () => {
        it('should return a role by id', async () => {
            const id = randomUUID();
            mockRoleRepository.findOne.mockResolvedValue(mockRole);

            const result = await service.findOneActiveById(id);

            expect(result).toEqual(mockRole);
            expect(mockRoleRepository.findOne).toHaveBeenCalledWith(
                { id: id, isActive: true },
                undefined
            );
        });

        it('should return null if role not found', async () => {
            const id = randomUUID();
            mockRoleRepository.findOne.mockResolvedValue(null);

            const result = await service.findOneActiveById(id);

            expect(result).toBeNull();
            expect(mockRoleRepository.findOne).toHaveBeenCalledWith(
                { id: id, isActive: true },
                undefined
            );
        });
    });

    describe('existByNameAndWorkspace', () => {
        it('should check if role exists by name and workspace', async () => {
            const name = 'test-role';
            const workspaceId = randomUUID();

            mockRoleRepository.exists.mockResolvedValue(true);

            const result = await service.existByNameAndWorkspace(
                name,
                workspaceId
            );

            expect(result).toBe(true);
            expect(mockRoleRepository.exists).toHaveBeenCalledWith(
                expect.objectContaining({
                    $and: [expect.any(Object), { workspace: workspaceId }],
                })
            );
        });
    });

    describe('create', () => {
        it('should create a new role', async () => {
            const createDto = new RoleCreateRequestDto();
            createDto.name = 'test-role';
            createDto.description = 'Test Role';
            createDto.type = ENUM_POLICY_ROLE_TYPE.USER;
            createDto.permissions = [
                {
                    subject: ENUM_POLICY_SUBJECT.ACTIVITY,
                    action: [ENUM_POLICY_ACTION.DELETE],
                },
                {
                    subject: ENUM_POLICY_SUBJECT.AUTH,
                    action: [ENUM_POLICY_ACTION.DELETE],
                },
            ];

            mockRoleRepository.create.mockResolvedValue(mockRole);

            const result = await service.create(createDto);

            expect(result).toEqual(mockRole);
            expect(mockRoleRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    ...createDto,
                    isActive: true,
                }),
                undefined
            );
        });
    });

    describe('createMany', () => {
        it('should create multiple roles', async () => {
            const createDto: RoleCreateRequestDto[] = [
                {
                    name: 'new-role',
                    type: ENUM_POLICY_ROLE_TYPE.USER,
                    permissions: [],
                },
                {
                    name: 'new-role',
                    type: ENUM_POLICY_ROLE_TYPE.USER,
                    permissions: [],
                },
            ];

            mockRoleRepository.createMany.mockResolvedValue(true);

            const result = await service.createMany(createDto);

            expect(result).toBe(true);
            expect(mockRoleRepository.createMany).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        name: 'new-role',
                        type: ENUM_POLICY_ROLE_TYPE.USER,
                        isActive: true,
                        permissions: [],
                    }),
                ]),
                undefined
            );
        });
    });

    describe('createWithWorkspace', () => {
        it('should create a new role with workspace', async () => {
            const createDto = {
                name: 'new-role',
                description: 'New Role',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                permissions: [],
            };
            const workspace = {
                id: randomUUID(),
            } as any;

            // createWithWorkspace uses em.create directly (not the repository),
            // then persists. The mock em.create echoes the dto back unless a
            // return value is queued, so queue the expected role here.
            mockEntityManager.create.mockReturnValueOnce(mockRole);

            const result = await service.createWithWorkspace(
                createDto,
                workspace
            );

            expect(result).toEqual(mockRole);
            expect(mockEntityManager.create).toHaveBeenCalledWith(
                RoleEntity,
                expect.objectContaining({
                    name: 'new-role',
                    description: 'New Role',
                    type: ENUM_POLICY_ROLE_TYPE.USER,
                    permissions: [],
                    isActive: true,
                    workspace: expect.any(Object),
                })
            );
            expect(mockEntityManager.persist).toHaveBeenCalledWith(result);
        });
    });

    describe('update', () => {
        it('should update a role', async () => {
            const updateDto = {
                description: 'Updated Role',
                permissions: [],
            };

            mockRoleRepository.save.mockResolvedValue(mockRole);

            const result = await service.update(mockRole as any, updateDto);

            expect(result).toEqual(mockRole);
            expect(mockRole.description).toBe(updateDto.description);
            expect(mockRole.permissions).toEqual(updateDto.permissions);
            expect(mockRoleRepository.save).toHaveBeenCalledWith(
                mockRole,
                undefined
            );
        });
    });

    describe('updateWithWorkspace', () => {
        it('should update a role with workspace', async () => {
            const updateDto = {
                description: 'Updated Role',
                permissions: [],
            };
            const workspace = { _id: randomUUID() } as any;

            mockRoleRepository.save.mockResolvedValue(mockRole);

            const result = await service.updateWithWorkspace(
                mockRole as any,
                updateDto,
                workspace
            );

            expect(result).toEqual(mockRole);
            expect(mockRole.description).toBe(updateDto.description);
            expect(mockRole.workspace).toBe(workspace);
            expect(mockRoleRepository.save).toHaveBeenCalledWith(
                mockRole,
                undefined
            );
        });
    });

    describe('active', () => {
        it('should activate a role', async () => {
            mockRole.isActive = false;
            mockRoleRepository.save.mockResolvedValue(mockRole);

            const result = await service.active(mockRole as any);

            expect(result.isActive).toBe(true);
            expect(mockRoleRepository.save).toHaveBeenCalledWith(
                mockRole,
                undefined
            );
        });
    });

    describe('inactive', () => {
        it('should deactivate a role', async () => {
            mockRole.isActive = true;
            mockRoleRepository.save.mockResolvedValue(mockRole);

            const result = await service.inactive(mockRole as any);

            expect(result.isActive).toBe(false);
            expect(mockRoleRepository.save).toHaveBeenCalledWith(
                mockRole,
                undefined
            );
        });
    });

    describe('delete', () => {
        it('should delete a role', async () => {
            mockRoleRepository.delete.mockResolvedValue(true);

            await service.delete(mockRole as any);
            expect(mockRoleRepository.delete).toHaveBeenCalledWith(
                { id: mockRole.id },
                undefined
            );
        });
    });

    describe('deleteMany', () => {
        it('should delete multiple roles', async () => {
            const find = {
                name: 'new-role',
            };
            mockRoleRepository.deleteMany.mockResolvedValue(true);

            await service.deleteMany(find);
            expect(mockRoleRepository.deleteMany).toHaveBeenCalledWith(
                find,
                undefined
            );
        });
    });

    describe('mapList', () => {
        it('should map role list to response DTO', () => {
            const roles = [mockRole];
            const result = service.mapList(roles as any);

            expect(result).toHaveLength(1);
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('name');
            expect(result[0]).toHaveProperty('type');
            expect(result[0]).toHaveProperty('isActive');
        });
    });

    describe('mapGet', () => {
        it('should map role to get response DTO', () => {
            const result = service.mapGet(mockRole as any);

            expect(result).toHaveProperty('id');
            expect(result).toHaveProperty('name');
            expect(result).toHaveProperty('description');
            expect(result).toHaveProperty('type');
            expect(result).toHaveProperty('isActive');
            expect(result).toHaveProperty('permissions');
            expect(result).toHaveProperty('createdAt');
            expect(result).toHaveProperty('updatedAt');
        });
    });

    describe('mapShort', () => {
        it('should map role to short response DTO', () => {
            const result = service.mapShort(rolesMock as any);

            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('name');
            expect(result[0]).toHaveProperty('type');
            expect(result[0]).toHaveProperty('isActive');
        });
    });

    describe('createManyWithWorkspace', () => {
        it('should build role entities scoped to the workspace (no flush)', async () => {
            const workspace = { id: randomUUID(), name: 'Acme' } as any;
            const roles = [
                {
                    name: 'member',
                    description: 'Member role',
                    type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
                    permissions: [
                        {
                            subject: ENUM_POLICY_SUBJECT.CHATBOT,
                            action: [ENUM_POLICY_ACTION.READ],
                        },
                    ],
                },
            ];

            const result = await service.createManyWithWorkspace(
                roles as any,
                workspace
            );

            expect(result).toHaveLength(1);
            expect(mockEntityManager.create).toHaveBeenCalledWith(
                RoleEntity,
                expect.objectContaining({
                    name: 'member',
                    type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
                    isActive: true,
                    workspace,
                })
            );
            // createMany does not flush — persistence is the caller's job
            expect(mockEntityManager.flush).not.toHaveBeenCalled();
        });
    });

    describe('createWorkspaceOwnerRole', () => {
        it('should grant MANAGE on every allowed workspace subject', async () => {
            const workspace = { id: randomUUID(), name: 'Acme' } as any;
            mockEntityManager.create.mockImplementationOnce(
                (_: any, data: any) => data
            );

            const result: any =
                await service.createWorkspaceOwnerRole(workspace);

            expect(result.type).toBe(ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER);
            expect(result.isActive).toBe(true);
            expect(result.permissions).toHaveLength(
                ALLOWED_WORKSPACE_POLICY_SUBJECT.length
            );
            for (const subject of ALLOWED_WORKSPACE_POLICY_SUBJECT) {
                expect(result.permissions).toEqual(
                    expect.arrayContaining([
                        {
                            subject,
                            action: [ENUM_POLICY_ACTION.MANAGE],
                        },
                    ])
                );
            }
        });
    });

    describe('isWorkspaceOwnerRole', () => {
        const buildOwnerPermissions = () =>
            ALLOWED_WORKSPACE_POLICY_SUBJECT.map(subject => ({
                subject,
                action: [ENUM_POLICY_ACTION.MANAGE],
            }));

        it('should return true when role has MANAGE on WORKSPACE and all allowed subjects', async () => {
            const roleId = randomUUID();
            const workspaceId = randomUUID();
            mockRoleRepository.findOne.mockResolvedValue({
                id: roleId,
                permissions: buildOwnerPermissions(),
            });

            const result = await service.isWorkspaceOwnerRole(
                roleId,
                workspaceId
            );

            expect(result).toBe(true);
            expect(mockRoleRepository.findOne).toHaveBeenCalledWith({
                id: roleId,
                workspace: workspaceId,
            });
        });

        it('should return false when the role is missing a required MANAGE permission', async () => {
            mockRoleRepository.findOne.mockResolvedValue({
                id: randomUUID(),
                permissions: [
                    {
                        subject: ENUM_POLICY_SUBJECT.WORKSPACE,
                        action: [ENUM_POLICY_ACTION.READ],
                    },
                ],
            });

            const result = await service.isWorkspaceOwnerRole(
                randomUUID(),
                randomUUID()
            );

            expect(result).toBe(false);
        });

        it('should return false when the role does not exist', async () => {
            mockRoleRepository.findOne.mockResolvedValue(null);

            const result = await service.isWorkspaceOwnerRole(
                randomUUID(),
                randomUUID()
            );

            expect(result).toBe(false);
        });
    });

    describe('updateWithWorkspace', () => {
        it('should update permissions, description and workspace then save', async () => {
            const role: any = {
                id: randomUUID(),
                permissions: [],
                description: 'old',
            };
            const workspace = { id: randomUUID() } as any;
            const updateDto = {
                description: 'new',
                permissions: [
                    {
                        subject: ENUM_POLICY_SUBJECT.CHATBOT,
                        action: [ENUM_POLICY_ACTION.READ],
                    },
                ],
            };
            mockRoleRepository.save.mockResolvedValue(role);

            const result = await service.updateWithWorkspace(
                role,
                updateDto as any,
                workspace
            );

            expect(result).toBe(role);
            expect(role.description).toBe('new');
            expect(role.workspace).toBe(workspace);
            expect(role.permissions).toEqual(updateDto.permissions);
            expect(mockRoleRepository.save).toHaveBeenCalledWith(
                role,
                undefined
            );
        });
    });

    describe('findAllActiveByType', () => {
        it('should query active roles filtered by type', async () => {
            mockRoleRepository.find.mockResolvedValue(rolesMock);

            const result = await service.findAllActiveByType(
                ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER
            );

            expect(result).toEqual(rolesMock);
            expect(mockRoleRepository.find).toHaveBeenCalledWith(
                {
                    type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
                    isActive: true,
                },
                undefined
            );
        });
    });

    describe('findAllByTypes', () => {
        it('should query roles by a set of types', async () => {
            const types = [
                ENUM_POLICY_ROLE_TYPE.WORKSPACE_OWNER,
                ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
            ];
            mockRoleRepository.find.mockResolvedValue(rolesMock);

            const result = await service.findAllByTypes(types);

            expect(result).toEqual(rolesMock);
            expect(mockRoleRepository.find).toHaveBeenCalledWith(
                { type: { $in: types } },
                undefined
            );
        });
    });
});

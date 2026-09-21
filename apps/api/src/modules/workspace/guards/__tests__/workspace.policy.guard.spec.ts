import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '../../../policy/enums/policy.enum';
import { PolicyAbilityFactory } from '../../../policy/factories/policy.factory';
import { RoleService } from '../../../role/services/role.service';
import { WorkspaceMemberService } from '../../services/workspace.member.service';
import { WorkspacePolicyGuard } from '../workspace.policy.guard';

describe('WorkspacePolicyGuard', () => {
    let guard: WorkspacePolicyGuard;
    let reflector: Reflector;
    let workspaceMemberService: WorkspaceMemberService;
    let roleService: RoleService;
    let policyAbilityFactory: PolicyAbilityFactory;

    const mockUser = {
        id: 'user-id',
        type: ENUM_POLICY_ROLE_TYPE.USER,
    };

    const mockWorkspace = {
        _id: 'workspace-id',
        owner: { _id: 'owner-id' },
    };

    const mockRole = {
        _id: 'role-id',
        type: ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER,
        permissions: [
            {
                subject: ENUM_POLICY_SUBJECT.CHATBOT,
                action: [ENUM_POLICY_ACTION.READ],
            },
        ],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WorkspacePolicyGuard,
                {
                    provide: Reflector,
                    useValue: {
                        get: jest.fn(),
                    },
                },
                {
                    provide: WorkspaceMemberService,
                    useValue: {
                        getMemberWorkspaceRoles: jest.fn(),
                    },
                },
                {
                    provide: RoleService,
                    useValue: {
                        findOneById: jest.fn(),
                    },
                },
                {
                    provide: PolicyAbilityFactory,
                    useValue: {
                        createForUser: jest.fn(),
                        handlerAbilities: jest.fn(),
                    },
                },
            ],
        }).compile();

        guard = module.get<WorkspacePolicyGuard>(WorkspacePolicyGuard);
        reflector = module.get<Reflector>(Reflector);
        workspaceMemberService = module.get<WorkspaceMemberService>(
            WorkspaceMemberService
        );
        roleService = module.get<RoleService>(RoleService);
        policyAbilityFactory =
            module.get<PolicyAbilityFactory>(PolicyAbilityFactory);
    });

    it('should be defined', () => {
        expect(guard).toBeDefined();
    });

    it('should allow super admin to access', async () => {
        const mockContext = createMockExecutionContext({
            ...mockUser,
            type: ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN,
        });

        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
    });

    it('should allow workspace owner to access', async () => {
        const mockContext = createMockExecutionContext(
            { ...mockUser, id: 'owner-id' }, // Same as workspace owner
            mockWorkspace
        );

        const result = await guard.canActivate(mockContext);
        expect(result).toBe(true);
    });

    it('should check user permissions for workspace members', async () => {
        const requiredAbilities = [
            {
                subject: ENUM_POLICY_SUBJECT.CHATBOT,
                action: [ENUM_POLICY_ACTION.READ],
            },
        ];

        jest.spyOn(reflector, 'get').mockReturnValueOnce(requiredAbilities);
        jest.spyOn(
            workspaceMemberService,
            'getMemberWorkspaceRoles'
        ).mockResolvedValue([mockRole as any]);
        jest.spyOn(roleService, 'findOneById').mockResolvedValue(
            mockRole as any
        );
        jest.spyOn(policyAbilityFactory, 'createForUser').mockReturnValue(
            {} as any
        );
        jest.spyOn(policyAbilityFactory, 'handlerAbilities').mockReturnValue(
            true
        );

        const mockContext = createMockExecutionContext(mockUser, mockWorkspace);

        const result = await guard.canActivate(mockContext);

        expect(
            workspaceMemberService.getMemberWorkspaceRoles
        ).toHaveBeenCalledWith('workspace-id', 'user-id');
        expect(roleService.findOneById).toHaveBeenCalledWith('role-id');
        expect(policyAbilityFactory.createForUser).toHaveBeenCalledWith(
            mockRole.permissions
        );
        expect(policyAbilityFactory.handlerAbilities).toHaveBeenCalledWith(
            {},
            requiredAbilities
        );
        expect(result).toBe(true);
    });

    function createMockExecutionContext(
        user = mockUser,
        workspace = mockWorkspace
    ): ExecutionContext {
        return {
            switchToHttp: () => ({
                getRequest: () => ({
                    __user: user,
                    user: user,
                    __workspace: workspace,
                    params: { workspace: workspace._id },
                }),
            }),
            getHandler: () => ({}),
        } as ExecutionContext;
    }
});

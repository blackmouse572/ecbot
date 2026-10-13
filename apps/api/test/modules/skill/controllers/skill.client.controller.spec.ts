import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ClientCredentialGuard } from '../../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../../src/modules/client-credential/constants/client-credential.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../../src/modules/workspace/repository/entities/workspace.entity';
import { SkillClientController } from '../../../../src/modules/skill/controllers/skill.client.controller';

// /client surface: the workspace's skills and the builtin templates they
// can be cloned from. Writes act as the credential's creator.

const mockSkillService = {
    findAllByWorkspace: jest.fn(),
    getTotalByWorkspace: jest.fn(),
    mapList: jest.fn(),
    getOne: jest.fn(),
    mapOne: jest.fn(),
    create: jest.fn(),
    cloneFromTemplate: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
};

const mockPaginationService = {
    totalPage: jest.fn((total: number, limit: number) =>
        Math.ceil(total / limit)
    ),
};

const mockActivityService = {
    createByUserWithWorkspace: jest.fn(),
};

describe('SkillClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    const credential = { createdBy: { id: 'creator-1' } } as any;
    const paging = { _search: {}, _limit: 10, _offset: 0, _order: {} } as any;
    let controller: SkillClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new SkillClientController(
            mockSkillService as any,
            mockPaginationService as any,
            mockActivityService as any
        );
    });

    it('is mounted at /skills', () => {
        expect(Reflect.getMetadata(PATH_METADATA, SkillClientController)).toBe(
            '/skills'
        );
    });

    it.each([
        ['list', ENUM_POLICY_ACTION.READ],
        ['get', ENUM_POLICY_ACTION.READ],
        ['create', ENUM_POLICY_ACTION.CREATE],
        ['clone', ENUM_POLICY_ACTION.CREATE],
        ['update', ENUM_POLICY_ACTION.UPDATE],
        ['delete', ENUM_POLICY_ACTION.DELETE],
    ] as const)('%s is guarded and needs SKILL %s', (handler, action) => {
        const method = SkillClientController.prototype[handler];
        expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
            ClientCredentialGuard,
            ClientCredentialPolicyGuard,
        ]);
        expect(
            Reflect.getMetadata(
                CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                method
            )
        ).toEqual([{ subject: ENUM_POLICY_SUBJECT.SKILL, action: [action] }]);
    });

    it('documents the source filter', () => {
        const documented = Reflect.getMetadata(
            'swagger/apiParameters',
            SkillClientController.prototype.list
        ).map((param: { name: string }) => param.name);

        expect(documented).toContain('source');
    });

    it.each([
        [undefined, 'workspace'],
        ['template', 'template'],
        ['all', 'all'],
        ['bogus', 'workspace'],
    ])('lists source %s as %s', async (source, scope) => {
        mockSkillService.findAllByWorkspace.mockResolvedValue([]);
        mockSkillService.getTotalByWorkspace.mockResolvedValue(0);
        mockSkillService.mapList.mockReturnValue([]);

        await controller.list(workspace, paging, source);

        expect(mockSkillService.findAllByWorkspace).toHaveBeenCalledWith(
            'workspace-1',
            {},
            scope,
            { limit: 10, offset: 0, order: {} }
        );
    });

    it('gets a skill with its instructions', async () => {
        mockSkillService.getOne.mockResolvedValue({
            skill: { id: 's-1' },
            instructions: 'Ask for the order code.',
        });
        mockSkillService.mapOne.mockReturnValue({ id: 's-1' });

        await expect(controller.get(workspace, 's-1')).resolves.toEqual({
            data: { id: 's-1' },
        });
        expect(mockSkillService.mapOne).toHaveBeenCalledWith(
            { id: 's-1' },
            'Ask for the order code.'
        );
    });

    it('creates a skill as the creator and logs it', async () => {
        mockSkillService.create.mockResolvedValue({
            id: 's-1',
            name: 'Refunds',
        });
        const dto = { name: 'Refunds', instructions: '...' } as any;

        const result = await controller.create(workspace, credential, dto);

        expect(mockSkillService.create).toHaveBeenCalledWith(
            'workspace-1',
            dto,
            credential.createdBy
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'create',
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { id: 's-1', name: 'Refunds' },
        });
        expect(result).toEqual({ data: { id: 's-1' } });
    });

    it('clones a template into the workspace as the creator', async () => {
        mockSkillService.cloneFromTemplate.mockResolvedValue({
            id: 's-2',
            name: 'Refunds',
        });

        const result = await controller.clone(workspace, credential, 'tpl-1');

        expect(mockSkillService.cloneFromTemplate).toHaveBeenCalledWith(
            'workspace-1',
            'tpl-1',
            credential.createdBy
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'create',
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { id: 's-2', name: 'Refunds', clonedFrom: 'tpl-1' },
        });
        expect(result).toEqual({ data: { id: 's-2' } });
    });

    it('updates a skill as the creator', async () => {
        mockSkillService.update.mockResolvedValue({
            id: 's-1',
            name: 'Refunds',
        });

        await controller.update(workspace, credential, 's-1', {
            instructions: 'New',
        } as any);

        expect(mockSkillService.update).toHaveBeenCalledWith(
            'workspace-1',
            's-1',
            { instructions: 'New' },
            credential.createdBy
        );
    });

    it('deletes a skill and logs it as the creator', async () => {
        mockSkillService.softDelete.mockResolvedValue({
            id: 's-1',
            name: 'Refunds',
        });

        const result = await controller.delete(workspace, credential, 's-1');

        expect(mockSkillService.softDelete).toHaveBeenCalledWith(
            'workspace-1',
            's-1'
        );
        expect(
            mockActivityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(credential.createdBy, workspace, {
            action: 'delete',
            subject: ENUM_POLICY_SUBJECT.SKILL,
            metadata: { id: 's-1', name: 'Refunds' },
        });
        expect(result).toEqual({ data: { id: 's-1' } });
    });
});

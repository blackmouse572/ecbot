import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ClientCredentialGuard } from 'src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from 'src/modules/client-credential/guards/client-credential.policy.guard';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from 'src/modules/client-credential/constants/client-credential.constant';
import { FEATURE_FLAG_META_KEY } from 'src/modules/feature-flag/constants/feature-flag.constant';
import { ENUM_FEATURE_FLAG } from 'src/modules/feature-flag/enums/feature-flag.enum';
import { MarketingSavedAudienceClientController } from 'src/modules/marketing/controllers/marketing-saved-audience.client.controller';
import { ENUM_MARKETING_TODO as T } from 'src/modules/marketing/enums/marketing-overview.enum';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

// /client surface: saved audiences with the workspace routes' abilities,
// behind the marketing flag, acting as the credential's creator.
describe('MarketingSavedAudienceClientController', () => {
    const savedService = {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        mapGet: jest.fn(),
    };
    const activityService = { createByUserWithWorkspace: jest.fn() };
    const controller = new MarketingSavedAudienceClientController(
        savedService as any,
        {} as any,
        activityService as any
    );
    const workspace = { id: 'ws1' } as WorkspaceEntity;
    const credential = { createdBy: { id: 'creator-1' } } as any;

    beforeEach(() => jest.clearAllMocks());

    it('is mounted at /marketing/audiences behind the marketing flag', () => {
        const C = MarketingSavedAudienceClientController;
        expect(Reflect.getMetadata(PATH_METADATA, C)).toBe(
            '/marketing/audiences'
        );
        expect(Reflect.getMetadata(FEATURE_FLAG_META_KEY, C)).toBe(
            ENUM_FEATURE_FLAG.MARKETING
        );
    });

    it.each([
        ['list', ENUM_POLICY_ACTION.READ],
        ['create', ENUM_POLICY_ACTION.CREATE],
        ['update', ENUM_POLICY_ACTION.UPDATE],
        ['delete', ENUM_POLICY_ACTION.DELETE],
    ] as const)('%s is guarded and needs MARKETING %s', (handler, action) => {
        const method =
            MarketingSavedAudienceClientController.prototype[handler];
        expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
            ClientCredentialGuard,
            ClientCredentialPolicyGuard,
        ]);
        expect(
            Reflect.getMetadata(
                CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                method
            )
        ).toEqual([
            { subject: ENUM_POLICY_SUBJECT.MARKETING, action: [action] },
        ]);
    });

    it('saves in the credential workspace and logs it as the creator', async () => {
        savedService.create.mockResolvedValue({ id: 'a1', name: 'Mua lại' });
        savedService.mapGet.mockReturnValue({ id: 'a1' });

        await expect(
            controller.create(workspace, credential, {
                name: 'Mua lại',
                preset: T.REPURCHASE,
            })
        ).resolves.toEqual({ data: { id: 'a1' } });
        expect(savedService.create).toHaveBeenCalledWith('ws1', {
            name: 'Mua lại',
            preset: T.REPURCHASE,
        });
        expect(activityService.createByUserWithWorkspace).toHaveBeenCalledWith(
            credential.createdBy,
            workspace,
            expect.objectContaining({
                metadata: { id: 'a1', name: 'Mua lại' },
            })
        );
    });
});

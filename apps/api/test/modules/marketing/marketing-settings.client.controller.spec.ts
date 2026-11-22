import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from 'src/modules/client-credential/constants/client-credential.constant';
import { ClientCredentialGuard } from 'src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from 'src/modules/client-credential/guards/client-credential.policy.guard';
import { FEATURE_FLAG_META_KEY } from 'src/modules/feature-flag/constants/feature-flag.constant';
import { ENUM_FEATURE_FLAG } from 'src/modules/feature-flag/enums/feature-flag.enum';
import { MarketingSettingsClientController } from 'src/modules/marketing/controllers/marketing-settings.client.controller';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from 'src/modules/workspace/repository/entities/workspace.entity';

// /client surface: Cài đặt gửi tin with the workspace routes' abilities,
// behind the marketing flag, acting as the credential's creator.
describe('MarketingSettingsClientController', () => {
    const settingsService = { get: jest.fn(), update: jest.fn() };
    const activityService = { createByUserWithWorkspace: jest.fn() };
    const controller = new MarketingSettingsClientController(
        settingsService as any,
        activityService as any
    );
    const workspace = { id: 'ws1' } as WorkspaceEntity;
    const credential = { createdBy: { id: 'creator-1' } } as any;

    it('is mounted at /marketing/settings behind the marketing flag', () => {
        const C = MarketingSettingsClientController;
        expect(Reflect.getMetadata(PATH_METADATA, C)).toBe(
            '/marketing/settings'
        );
        expect(Reflect.getMetadata(FEATURE_FLAG_META_KEY, C)).toBe(
            ENUM_FEATURE_FLAG.MARKETING
        );
    });

    it.each([
        ['get', ENUM_POLICY_ACTION.READ],
        ['update', ENUM_POLICY_ACTION.UPDATE],
    ] as const)('%s is guarded and needs MARKETING %s', (handler, action) => {
        const method = MarketingSettingsClientController.prototype[handler];
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
        settingsService.update.mockResolvedValue({ maxPer30Days: 2 });

        await expect(
            controller.update(workspace, credential, { maxPer30Days: 2 })
        ).resolves.toEqual({ data: { maxPer30Days: 2 } });
        expect(settingsService.update).toHaveBeenCalledWith('ws1', {
            maxPer30Days: 2,
        });
        expect(activityService.createByUserWithWorkspace).toHaveBeenCalledWith(
            credential.createdBy,
            workspace,
            expect.objectContaining({
                metadata: { marketingSettings: ['maxPer30Days'] },
            })
        );
    });
});

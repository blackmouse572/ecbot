import { NotFoundException } from '@nestjs/common';
import { AccountService } from '../../../../src/modules/account/services/account.service';
import { AccountEntity } from '../../../../src/modules/account/repository/entities/account.entity';
import {
    ENUM_ACCOUNT_TYPE,
    ENUM_ACCOUNT_STATUS,
} from '../../../../src/modules/account/enums/account.enum';
import { ConversationEntity } from '../../../../src/modules/conversation/repository/entities/conversation.entity';
import { MessageEntity } from '../../../../src/modules/conversation/repository/entities/message.entity';
import { FollowupEntity } from '../../../../src/modules/platform/repository/entities/followup.entity';

const mockOAuthResult = {
    accessToken: 'raw-access-token',
    refreshToken: 'raw-refresh-token',
    tokenExpiresAt: new Date('2026-05-01'),
    externalId: 'ext-123',
    name: 'Test User',
    avatar: 'https://example.com/avatar.png',
    link: 'https://example.com/ext-123',
};

const mockPlatformService = {
    getTokenAndProfile: jest.fn().mockResolvedValue(mockOAuthResult),
    refreshToken: jest.fn(),
};

const mockOAuthFactory = {
    getService: jest.fn().mockReturnValue(mockPlatformService),
};

const mockEncryption = {
    envelopeEncrypt: jest.fn(token => `enveloped:${token}`),
    envelopeDecrypt: jest.fn(token => token.replace('enveloped:', '')),
};

const mockUpsertedAccount = {
    id: 'account-uuid-1',
    externalId: 'ext-123',
    name: 'Test User',
    accessToken: 'enveloped:raw-access-token',
    refreshToken: 'enveloped:raw-refresh-token',
    status: ENUM_ACCOUNT_STATUS.ACTIVE,
    type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
};

const mockAccountRepository = {
    upsert: jest.fn().mockResolvedValue(mockUpsertedAccount),
    create: jest.fn(),
    findExpiringSoon: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    findOneById: jest.fn(),
    deleteMany: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
    getTotal: jest.fn(),
    findOne: jest.fn(),
};

const mockFacebookWebhookService = {
    registerWebhook: jest.fn().mockResolvedValue(true),
    subscribePageWebhook: jest.fn().mockResolvedValue(true),
};

const mockFacebookPageService = {
    getPages: jest.fn().mockResolvedValue([]),
};

const mockTem = {
    find: jest.fn().mockResolvedValue([]),
    nativeDelete: jest.fn().mockResolvedValue(0),
};

const mockEm = {
    getReference: jest.fn().mockReturnValue({ id: 'workspace-uuid-1' }),
    find: jest.fn().mockResolvedValue([]),
    nativeUpdate: jest.fn().mockResolvedValue(0),
    nativeDelete: jest.fn().mockResolvedValue(0),
    transactional: jest.fn((cb: (tem: typeof mockTem) => unknown) =>
        cb(mockTem)
    ),
};

function buildService() {
    return new AccountService(
        mockEm as any,
        mockAccountRepository as any,
        mockFacebookPageService as any,
        mockFacebookWebhookService as any,
        {} as any,
        mockOAuthFactory as any,
        mockEncryption as any
    );
}

describe('AccountService - syncAccount', () => {
    let service: AccountService;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPlatformService.getTokenAndProfile.mockResolvedValue(
            mockOAuthResult
        );
        mockAccountRepository.upsert.mockResolvedValue(mockUpsertedAccount);
        mockOAuthFactory.getService.mockReturnValue(mockPlatformService);
        service = buildService();
    });

    it('calls getTokenAndProfile with the authorization code', async () => {
        await service.syncAccount(
            'auth-code',
            ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
            'ws-1',
            'user-1'
        );

        expect(mockPlatformService.getTokenAndProfile).toHaveBeenCalledWith(
            'auth-code'
        );
    });

    it('selects the platform service based on the platform argument', async () => {
        await service.syncAccount(
            'auth-code',
            ENUM_ACCOUNT_TYPE.TIKTOK_SHOP,
            'ws-1',
            'user-1'
        );

        expect(mockOAuthFactory.getService).toHaveBeenCalledWith(
            ENUM_ACCOUNT_TYPE.TIKTOK_SHOP
        );
    });

    it('encrypts the access token before persisting', async () => {
        await service.syncAccount(
            'auth-code',
            ENUM_ACCOUNT_TYPE.ZALO_ACCOUNT,
            'ws-1',
            'user-1'
        );

        const upsertCall = mockAccountRepository.upsert.mock.calls[0][0];
        expect(upsertCall.accessToken).toBe('enveloped:raw-access-token');
    });

    it('encrypts the refresh token before persisting', async () => {
        await service.syncAccount(
            'auth-code',
            ENUM_ACCOUNT_TYPE.ZALO_ACCOUNT,
            'ws-1',
            'user-1'
        );

        const upsertCall = mockAccountRepository.upsert.mock.calls[0][0];
        expect(upsertCall.refreshToken).toBe('enveloped:raw-refresh-token');
    });

    it('persists tokenExpiresAt on the account', async () => {
        await service.syncAccount(
            'auth-code',
            ENUM_ACCOUNT_TYPE.SHOPEE_SHOP,
            'ws-1',
            'user-1'
        );

        const upsertCall = mockAccountRepository.upsert.mock.calls[0][0];
        expect(upsertCall.tokenExpiresAt).toEqual(
            mockOAuthResult.tokenExpiresAt
        );
    });

    it('throws NotFoundException when platform service returns no access token', async () => {
        mockPlatformService.getTokenAndProfile.mockResolvedValueOnce({
            ...mockOAuthResult,
            accessToken: null,
        });

        await expect(
            service.syncAccount(
                'bad-code',
                ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
                'ws-1',
                'user-1'
            )
        ).rejects.toThrow(NotFoundException);
    });

    it('does not call Facebook webhook services for non-Facebook platforms', async () => {
        await service.syncAccount(
            'auth-code',
            ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
            'ws-1',
            'user-1'
        );

        expect(
            mockFacebookWebhookService.registerWebhook
        ).not.toHaveBeenCalled();
        expect(mockFacebookPageService.getPages).not.toHaveBeenCalled();
    });

    it('calls Facebook webhook registration for FACEBOOK_ACCOUNT', async () => {
        await service.syncAccount(
            'auth-code',
            ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT,
            'ws-1',
            'user-1'
        );

        expect(mockFacebookWebhookService.registerWebhook).toHaveBeenCalled();
    });

    it('returns account with empty pages array for non-Facebook platforms', async () => {
        const result = await service.syncAccount(
            'auth-code',
            ENUM_ACCOUNT_TYPE.ZALO_ACCOUNT,
            'ws-1',
            'user-1'
        );

        expect(result.pages).toEqual([]);
    });

    // One WhatsApp signup can connect several numbers of the same business.
    it('links each additional account from the same login alongside the first', async () => {
        const second = {
            accessToken: 'raw-second-token',
            externalId: 'ext-456',
            name: 'Second Number',
            link: 'https://example.com/ext-456',
        };
        mockPlatformService.getTokenAndProfile.mockResolvedValueOnce({
            ...mockOAuthResult,
            additionalAccounts: [second],
        });
        const secondAccount = {
            ...mockUpsertedAccount,
            id: 'account-uuid-2',
            externalId: 'ext-456',
        };
        mockAccountRepository.upsert
            .mockResolvedValueOnce(mockUpsertedAccount)
            .mockResolvedValueOnce(secondAccount);

        const result = await service.syncAccount(
            'auth-code',
            ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS,
            'ws-1',
            'user-1'
        );

        expect(mockAccountRepository.upsert).toHaveBeenCalledTimes(2);
        const secondUpsert = mockAccountRepository.upsert.mock.calls[1][0];
        expect(secondUpsert).toMatchObject({
            externalId: 'ext-456',
            name: 'Second Number',
            accessToken: 'enveloped:raw-second-token',
            type: ENUM_ACCOUNT_TYPE.WHATSAPP_BUSINESS,
        });
        expect(result.pages.map(p => p.id)).toEqual(['account-uuid-2']);
    });

    it('excludes accessToken from the returned account', async () => {
        const result = await service.syncAccount(
            'auth-code',
            ENUM_ACCOUNT_TYPE.ZALO_ACCOUNT,
            'ws-1',
            'user-1'
        );

        expect(result.accessToken).toBeUndefined();
    });
});

describe('AccountService - findOneByIdOrSlug', () => {
    let service: AccountService;
    const validId = 'a0000000-0000-4000-8000-000000000001';

    beforeEach(() => {
        jest.clearAllMocks();
        mockAccountRepository.findOne.mockResolvedValue(null);
        service = buildService();
    });

    // S-9: a workspace user must not be able to read another workspace's
    // account by id — scoping is only applied when a workspaceId is passed.
    it('adds workspace to the where conditions when a workspaceId is given', async () => {
        await service.findOneByIdOrSlug(validId, undefined, 'workspace-uuid-1');

        expect(mockAccountRepository.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ workspace: 'workspace-uuid-1' }),
            expect.anything()
        );
    });

    it('omits workspace from the where conditions when no workspaceId is given (admin, cross-tenant)', async () => {
        await service.findOneByIdOrSlug(validId);

        const [where] = mockAccountRepository.findOne.mock.calls[0];
        expect(where).not.toHaveProperty('workspace');
    });
});

describe('AccountService - deleteSyncAccount', () => {
    let service: AccountService;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEm.find.mockResolvedValue([]);
        mockEm.nativeUpdate.mockResolvedValue(0);
        mockEm.nativeDelete.mockResolvedValue(0);
        mockEm.transactional.mockImplementation(cb => cb(mockTem));
        mockTem.find.mockResolvedValue([]);
        mockTem.nativeDelete.mockResolvedValue(0);
        mockAccountRepository.deleteMany.mockResolvedValue(undefined);
        mockAccountRepository.delete.mockResolvedValue(undefined);
        mockAccountRepository.save.mockResolvedValue(undefined);
        service = buildService();
    });

    it('invokes platform onUnlink cleanup with the decrypted token when unlinking a Telegram account', async () => {
        const onUnlink = jest.fn().mockResolvedValue(undefined);
        mockOAuthFactory.getService.mockReturnValue({
            ...mockPlatformService,
            onUnlink,
        });
        mockAccountRepository.findOne.mockResolvedValue({
            id: 'account-uuid-1',
            type: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
            accessToken: 'enveloped:raw-bot-token',
        });

        await service.deleteSyncAccount('account-uuid-1', 'ws-1');

        expect(mockOAuthFactory.getService).toHaveBeenCalledWith(
            ENUM_ACCOUNT_TYPE.TELEGRAM_BOT
        );
        expect(onUnlink).toHaveBeenCalledWith('raw-bot-token');
    });

    it('still unlinks when platform cleanup throws', async () => {
        const onUnlink = jest
            .fn()
            .mockRejectedValue(new Error('telegram down'));
        mockOAuthFactory.getService.mockReturnValue({
            ...mockPlatformService,
            onUnlink,
        });
        mockAccountRepository.findOne.mockResolvedValue({
            id: 'account-uuid-1',
            type: ENUM_ACCOUNT_TYPE.TELEGRAM_BOT,
            accessToken: 'enveloped:raw-bot-token',
        });

        await expect(
            service.deleteSyncAccount('account-uuid-1', 'ws-1')
        ).resolves.toBe(true);
        expect(mockTem.nativeDelete).toHaveBeenCalledWith(AccountEntity, {
            id: 'account-uuid-1',
        });
    });

    // Regression test: the whole cascade (messages, followups, conversations,
    // account) must commit or roll back together — a partial failure must
    // not leave e.g. messages deleted but the account still referencing them.
    it('runs the whole delete cascade inside a single transaction', async () => {
        mockAccountRepository.findOne.mockResolvedValue({
            id: 'account-uuid-1',
            type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
        });
        mockTem.find.mockResolvedValue([{ id: 'conv-1' }]);

        await service.deleteSyncAccount('account-uuid-1', 'ws-1');

        expect(mockEm.transactional).toHaveBeenCalledTimes(1);
        // every delete must run on the transactional `tem`, never the outer `em`
        expect(mockEm.nativeDelete).not.toHaveBeenCalled();
    });

    it('hard-deletes the account when no conversations reference it, without touching messages/followups', async () => {
        mockAccountRepository.findOne.mockResolvedValue({
            id: 'account-uuid-1',
            type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
        });
        mockTem.find.mockResolvedValue([]);

        await service.deleteSyncAccount('account-uuid-1', 'ws-1');

        expect(mockTem.nativeDelete).not.toHaveBeenCalledWith(
            MessageEntity,
            expect.anything()
        );
        expect(mockTem.nativeDelete).toHaveBeenCalledWith(AccountEntity, {
            id: 'account-uuid-1',
        });
    });

    // Regression test for the production 500: conversations/messages/followups
    // keep a non-nullable, non-cascading FK to accounts/conversations, so
    // hard-deleting an account with conversation history used to violate
    // "conversations_account_id_foreign". Per product decision, unlinking an
    // account now hard-deletes its conversations + messages + followups too,
    // then hard-deletes the account — no history is kept after unlink.
    it('hard-deletes conversations, messages and followups before the account when conversations reference it', async () => {
        mockAccountRepository.findOne.mockResolvedValue({
            id: 'account-uuid-1',
            type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
        });
        mockTem.find.mockResolvedValue([{ id: 'conv-1' }, { id: 'conv-2' }]);

        await service.deleteSyncAccount('account-uuid-1', 'ws-1');

        expect(mockTem.nativeDelete).toHaveBeenCalledWith(MessageEntity, {
            conversation: { $in: ['conv-1', 'conv-2'] },
        });
        expect(mockTem.nativeDelete).toHaveBeenCalledWith(FollowupEntity, {
            conversation: { $in: ['conv-1', 'conv-2'] },
        });
        expect(mockTem.nativeDelete).toHaveBeenCalledWith(ConversationEntity, {
            id: { $in: ['conv-1', 'conv-2'] },
        });
        expect(mockTem.nativeDelete).toHaveBeenCalledWith(AccountEntity, {
            id: 'account-uuid-1',
        });
    });

    // Regression test: sub-accounts (pages under a parent account) are a
    // separate entity with their own lifecycle — unlinking the parent must
    // not touch them, their conversations, or call the bulk sub-account delete.
    it('scopes the conversation lookup to only this account, never sub-accounts', async () => {
        mockAccountRepository.findOne.mockResolvedValue({
            id: 'account-uuid-1',
            type: ENUM_ACCOUNT_TYPE.FACEBOOK_ACCOUNT,
        });

        await service.deleteSyncAccount('account-uuid-1', 'ws-1');

        expect(mockTem.find).toHaveBeenCalledWith(ConversationEntity, {
            account: 'account-uuid-1',
        });
        expect(mockEm.find).not.toHaveBeenCalled();
        expect(mockAccountRepository.deleteMany).not.toHaveBeenCalled();
    });

    it('looks the account up scoped to the given workspace with deletedAt null', async () => {
        mockAccountRepository.findOne.mockResolvedValue({
            id: 'account-uuid-1',
            type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
        });

        await service.deleteSyncAccount('account-uuid-1', 'ws-1');

        expect(mockAccountRepository.findOne).toHaveBeenCalledWith({
            id: 'account-uuid-1',
            workspace: 'ws-1',
            deletedAt: null,
        });
    });

    // S-9: a hard-delete request for an id that belongs to another workspace
    // must be indistinguishable from an unknown id — no cleanup, no transaction.
    it('returns false for an id belonging to another workspace, without running unlink cleanup or the transaction', async () => {
        mockAccountRepository.findOne.mockResolvedValue(null);

        const result = await service.deleteSyncAccount(
            'account-uuid-1',
            'ws-1'
        );

        expect(result).toBe(false);
        expect(mockOAuthFactory.getService).not.toHaveBeenCalled();
        expect(mockEm.transactional).not.toHaveBeenCalled();
    });
});

// S-7: the admin write paths (create / upsert / update) used to store the
// token exactly as the DTO carried it, so a plaintext row later decrypted to
// garbage and the refresh cron blocked the account. Every write path must put
// an enveloped value on the entity, and must never re-wrap one.
describe('AccountService - create', () => {
    let service: AccountService;

    const baseCreateDto = {
        link: 'https://example.com/ext-123',
        name: 'Test User',
        accessToken: 'raw-access-token',
        type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
        workspace: 'workspace-uuid-1',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockAccountRepository.create.mockImplementation(
            (entity: AccountEntity) => Promise.resolve(entity)
        );
        service = buildService();
    });

    it('encrypts a plaintext access token before persisting', async () => {
        await service.create({ ...baseCreateDto } as any);

        const [entity] = mockAccountRepository.create.mock.calls[0];
        expect(entity.accessToken).toBe('enveloped:raw-access-token');
    });

    it('leaves an already enveloped access token untouched', async () => {
        await service.create({
            ...baseCreateDto,
            accessToken: 'v1:v1:iv:tag:cipher',
        } as any);

        const [entity] = mockAccountRepository.create.mock.calls[0];
        expect(entity.accessToken).toBe('v1:v1:iv:tag:cipher');
        expect(mockEncryption.envelopeEncrypt).not.toHaveBeenCalled();
    });

    it('does not copy DTO keys that are not entity fields onto the entity', async () => {
        await service.create({
            ...baseCreateDto,
            addedBy: 'user-uuid-1',
            cookies: ['c1'],
            proxies: ['p1'],
            role: 'SUPER_ADMIN',
        } as any);

        const [entity] = mockAccountRepository.create.mock.calls[0];
        expect(entity).not.toHaveProperty('cookies');
        expect(entity).not.toHaveProperty('proxies');
        expect(entity).not.toHaveProperty('addedBy');
        expect(entity).not.toHaveProperty('role');
    });

    it('resolves the workspace id into an entity reference', async () => {
        await service.create({ ...baseCreateDto } as any);

        expect(mockEm.getReference).toHaveBeenCalledWith(
            expect.anything(),
            'workspace-uuid-1'
        );
    });
});

describe('AccountService - upsert', () => {
    let service: AccountService;

    const baseUpsertDto = {
        link: 'https://example.com/ext-123',
        name: 'Test User',
        accessToken: 'raw-access-token',
        type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
        workspace: 'workspace-uuid-1',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockAccountRepository.upsert.mockResolvedValue(mockUpsertedAccount);
        service = buildService();
    });

    it('encrypts a plaintext access token before persisting', async () => {
        await service.upsert({ ...baseUpsertDto } as any);

        const [entity] = mockAccountRepository.upsert.mock.calls[0];
        expect(entity.accessToken).toBe('enveloped:raw-access-token');
    });

    it('leaves an already enveloped access token untouched', async () => {
        await service.upsert({
            ...baseUpsertDto,
            accessToken: 'v1:v1:iv:tag:cipher',
        } as any);

        const [entity] = mockAccountRepository.upsert.mock.calls[0];
        expect(entity.accessToken).toBe('v1:v1:iv:tag:cipher');
        expect(mockEncryption.envelopeEncrypt).not.toHaveBeenCalled();
    });
});

describe('AccountService - update', () => {
    let service: AccountService;

    function buildAccount(): AccountEntity {
        return {
            id: 'account-uuid-1',
            name: 'Old Name',
            accessToken: 'v1:v1:iv:tag:old-cipher',
            status: ENUM_ACCOUNT_STATUS.ACTIVE,
            type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
        } as AccountEntity;
    }

    beforeEach(() => {
        jest.clearAllMocks();
        mockAccountRepository.save.mockImplementation((entity: AccountEntity) =>
            Promise.resolve(entity)
        );
        service = buildService();
    });

    it('encrypts a plaintext access token before saving', async () => {
        const account = buildAccount();

        await service.update(account, {
            accessToken: 'raw-access-token',
        } as any);

        expect(account.accessToken).toBe('enveloped:raw-access-token');
    });

    it('leaves an already enveloped access token untouched', async () => {
        const account = buildAccount();

        await service.update(account, {
            accessToken: 'v1:v1:iv:tag:cipher',
        } as any);

        expect(account.accessToken).toBe('v1:v1:iv:tag:cipher');
        expect(mockEncryption.envelopeEncrypt).not.toHaveBeenCalled();
    });

    // S-8: mass assignment. The pipe whitelist strips unknown keys at the
    // edge, but the service must not copy them either — it is also called
    // with DTOs the controller has spread into.
    it('ignores keys that are not declared update fields', async () => {
        const account = buildAccount();

        await service.update(account, {
            name: 'New Name',
            deletedAt: new Date('2020-01-01'),
            createdBy: 'someone-else',
            id: 'another-account-uuid',
        } as any);

        expect(account.name).toBe('New Name');
        expect(account.id).toBe('account-uuid-1');
        expect(account.deletedAt).toBeUndefined();
        expect(account.createdBy).toBeUndefined();
    });

    it('resolves a workspace id into an entity reference', async () => {
        const account = buildAccount();

        await service.update(account, {
            workspace: 'workspace-uuid-1',
        } as any);

        expect(mockEm.getReference).toHaveBeenCalledWith(
            expect.anything(),
            'workspace-uuid-1'
        );
        expect(account.workspace).toEqual({ id: 'workspace-uuid-1' });
    });

    it('leaves fields the DTO does not carry alone', async () => {
        const account = buildAccount();

        await service.update(account, { name: 'New Name' } as any);

        expect(account.type).toBe(ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT);
        expect(account.status).toBe(ENUM_ACCOUNT_STATUS.ACTIVE);
        expect(account.accessToken).toBe('v1:v1:iv:tag:old-cipher');
    });
});

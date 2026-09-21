import { MikroORM } from '@mikro-orm/core';
import { Logger } from '@nestjs/common';
import { TokenEncryptionError } from '../../../../src/common/helper/exceptions/token-encryption.exception';
import { AccountTokenRefreshScheduler } from '../../../../src/modules/account/schedulers/account-token-refresh.scheduler';
import {
    ENUM_ACCOUNT_STATUS,
    ENUM_ACCOUNT_TYPE,
} from '../../../../src/modules/account/enums/account.enum';
import { ENUM_SEND_EMAIL_PROCESS } from '../../../../src/modules/email/enums/email.enum';

const mockRefreshResult = {
    accessToken: 'new-raw-access-token',
    refreshToken: 'new-raw-refresh-token',
    tokenExpiresAt: new Date('2026-06-01'),
    externalId: 'ext-123',
    name: 'Test User',
};

const makeMockAccount = (overrides = {}) => ({
    id: 'account-uuid-1',
    name: 'My Zalo Account',
    type: ENUM_ACCOUNT_TYPE.ZALO_ACCOUNT,
    status: ENUM_ACCOUNT_STATUS.ACTIVE,
    accessToken: 'enveloped:old-access-token',
    refreshToken: 'enveloped:old-refresh-token',
    tokenExpiresAt: new Date('2026-04-02T01:00:00Z'),
    workspace: {
        slug: 'my-workspace',
        owner: { id: 'owner-uuid-1', name: 'Owner', email: 'owner@x.com' },
    },
    ...overrides,
});

const mockPlatformService = {
    getTokenAndProfile: jest.fn(),
    refreshCredentials: jest.fn().mockResolvedValue(mockRefreshResult),
};

const mockOAuthFactory = {
    getService: jest.fn().mockReturnValue(mockPlatformService),
};

const mockEncryption = {
    envelopeEncrypt: jest.fn(token => `enveloped:${token}`),
    envelopeDecrypt: jest.fn(token => token.replace('enveloped:', '')),
};

const mockAccountRepository = {
    findExpiringSoon: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
};

const mockNotificationService = {
    createAccountBlocked: jest.fn().mockResolvedValue({}),
};

const mockCloudTasksClient = {
    enqueue: jest.fn().mockResolvedValue(undefined),
};

// The scheduler runs inside one per-job EntityManager fork (@ContextualCron);
// unsetIdentity(account) per account keeps the identity map bounded WITHOUT
// detaching the not-yet-processed accounts (which em.clear() would do).
const mockUow = { unsetIdentity: jest.fn() };
const mockEm = {
    name: 'default',
    fork: jest.fn(() => ({ name: 'default' })),
    getUnitOfWork: jest.fn(() => mockUow),
    populate: jest.fn().mockResolvedValue(undefined),
};
// instanceof MikroORM so @ContextualCron's context resolver accepts it.
const mockOrm = Object.assign(Object.create(MikroORM.prototype), {
    em: mockEm,
});

function buildScheduler() {
    return new AccountTokenRefreshScheduler(
        mockAccountRepository as any,
        mockOAuthFactory as any,
        mockEncryption as any,
        mockOrm as unknown as MikroORM,
        mockNotificationService as any,
        mockCloudTasksClient as any
    );
}

describe('AccountTokenRefreshScheduler - handleTokenRefresh', () => {
    let scheduler: AccountTokenRefreshScheduler;

    beforeEach(() => {
        jest.clearAllMocks();
        mockPlatformService.refreshCredentials.mockResolvedValue(
            mockRefreshResult
        );
        mockAccountRepository.findExpiringSoon.mockResolvedValue([]);
        mockOAuthFactory.getService.mockReturnValue(mockPlatformService);
        mockNotificationService.createAccountBlocked.mockResolvedValue({});
        mockCloudTasksClient.enqueue.mockResolvedValue(undefined);
        mockEm.populate.mockResolvedValue(undefined);
        scheduler = buildScheduler();
    });

    it('does nothing when there are no expiring accounts', async () => {
        mockAccountRepository.findExpiringSoon.mockResolvedValue([]);

        await scheduler.handleTokenRefresh();

        expect(mockPlatformService.refreshCredentials).not.toHaveBeenCalled();
        expect(mockAccountRepository.save).not.toHaveBeenCalled();
    });

    it('decrypts both tokens before calling platform refreshCredentials', async () => {
        const account = makeMockAccount();
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);

        await scheduler.handleTokenRefresh();

        expect(mockPlatformService.refreshCredentials).toHaveBeenCalledWith(
            'old-access-token',
            'old-refresh-token'
        );
    });

    it('saves the new encrypted access token after a successful refresh', async () => {
        const account = makeMockAccount();
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);

        await scheduler.handleTokenRefresh();

        expect(account.accessToken).toBe('enveloped:new-raw-access-token');
        expect(mockAccountRepository.save).toHaveBeenCalledWith(account);
    });

    it('saves the new encrypted refresh token after a successful refresh', async () => {
        const account = makeMockAccount();
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);

        await scheduler.handleTokenRefresh();

        expect(account.refreshToken).toBe('enveloped:new-raw-refresh-token');
    });

    it('updates tokenExpiresAt after a successful refresh', async () => {
        const account = makeMockAccount();
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);

        await scheduler.handleTokenRefresh();

        expect(account.tokenExpiresAt).toEqual(
            mockRefreshResult.tokenExpiresAt
        );
    });

    it('marks account as BLOCKED when refresh fails', async () => {
        const account = makeMockAccount();
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);
        mockPlatformService.refreshCredentials.mockRejectedValueOnce(
            new Error('Token expired')
        );

        await scheduler.handleTokenRefresh();

        expect(account.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
        expect(mockAccountRepository.save).toHaveBeenCalledWith(account);
    });

    it('continues processing remaining accounts when one refresh fails', async () => {
        const failingAccount = makeMockAccount({ id: 'account-1' });
        const successAccount = makeMockAccount({ id: 'account-2' });
        mockAccountRepository.findExpiringSoon.mockResolvedValue([
            failingAccount,
            successAccount,
        ]);
        mockPlatformService.refreshCredentials
            .mockRejectedValueOnce(new Error('Token expired'))
            .mockResolvedValueOnce(mockRefreshResult);

        await scheduler.handleTokenRefresh();

        expect(failingAccount.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
        expect(successAccount.accessToken).toBe(
            'enveloped:new-raw-access-token'
        );
        expect(mockAccountRepository.save).toHaveBeenCalledTimes(2);
    });

    it('releases each processed account from the identity map (only that account, not the batch)', async () => {
        // Regression guard for intra-job accretion: allowGlobalContext:false
        // cannot catch this (a context IS active) — only this assertion can.
        // Must be unsetIdentity (per account), NOT clear() — clear would detach
        // b and c before they are processed, breaking their save().
        const accounts = [
            makeMockAccount({ id: 'a' }),
            makeMockAccount({ id: 'b' }),
            makeMockAccount({ id: 'c' }),
        ];
        mockAccountRepository.findExpiringSoon.mockResolvedValue(accounts);

        await scheduler.handleTokenRefresh();

        expect(mockUow.unsetIdentity).toHaveBeenCalledTimes(3);
        accounts.forEach(a =>
            expect(mockUow.unsetIdentity).toHaveBeenCalledWith(a)
        );
    });

    it('releases the account even when its refresh throws (finally, not just happy path)', async () => {
        const account = makeMockAccount();
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);
        mockPlatformService.refreshCredentials.mockRejectedValueOnce(
            new Error('token endpoint down')
        );

        await scheduler.handleTokenRefresh();

        expect(mockUow.unsetIdentity).toHaveBeenCalledWith(account);
    });

    it('selects the platform service based on account type', async () => {
        const account = makeMockAccount({
            type: ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT,
        });
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);

        await scheduler.handleTokenRefresh();

        expect(mockOAuthFactory.getService).toHaveBeenCalledWith(
            ENUM_ACCOUNT_TYPE.INSTAGRAM_ACCOUNT
        );
    });

    it('does not notify the owner when refresh succeeds', async () => {
        const account = makeMockAccount();
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);

        await scheduler.handleTokenRefresh();

        expect(
            mockNotificationService.createAccountBlocked
        ).not.toHaveBeenCalled();
        expect(mockCloudTasksClient.enqueue).not.toHaveBeenCalled();
    });

    it('creates an in-app notification for the workspace owner when refresh fails', async () => {
        const account = makeMockAccount();
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);
        mockPlatformService.refreshCredentials.mockRejectedValueOnce(
            new Error('Token expired')
        );

        await scheduler.handleTokenRefresh();

        expect(mockEm.populate).toHaveBeenCalledWith(account, [
            'workspace.owner',
        ]);
        expect(
            mockNotificationService.createAccountBlocked
        ).toHaveBeenCalledWith(
            'owner-uuid-1',
            { id: 'account-uuid-1', name: 'My Zalo Account' },
            '/my-workspace/accounts/account-uuid-1'
        );
    });

    it('enqueues an ACCOUNT_BLOCKED email for the workspace owner when refresh fails', async () => {
        const account = makeMockAccount();
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);
        mockPlatformService.refreshCredentials.mockRejectedValueOnce(
            new Error('Token expired')
        );

        await scheduler.handleTokenRefresh();

        expect(mockCloudTasksClient.enqueue).toHaveBeenCalledWith(
            'email',
            ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BLOCKED,
            {
                send: { email: 'owner@x.com', name: 'Owner' },
                data: {
                    accountName: 'My Zalo Account',
                    reconnectUrl: '/my-workspace/accounts/account-uuid-1',
                },
            },
            {
                taskName: `${ENUM_SEND_EMAIL_PROCESS.ACCOUNT_BLOCKED}-account-uuid-1`,
            }
        );
    });

    it('does not stop processing remaining accounts when notifying the owner fails', async () => {
        const failingAccount = makeMockAccount({ id: 'account-1' });
        const anotherFailingAccount = makeMockAccount({ id: 'account-2' });
        mockAccountRepository.findExpiringSoon.mockResolvedValue([
            failingAccount,
            anotherFailingAccount,
        ]);
        mockPlatformService.refreshCredentials.mockRejectedValue(
            new Error('Token expired')
        );
        mockNotificationService.createAccountBlocked.mockRejectedValueOnce(
            new Error('notification service down')
        );

        await scheduler.handleTokenRefresh();

        expect(failingAccount.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
        expect(anotherFailingAccount.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
        expect(
            mockNotificationService.createAccountBlocked
        ).toHaveBeenCalledTimes(2);
    });
    // #384 S-12: a wrong OAUTH_TOKEN_ENCRYPT_KEY on one deploy must not block
    // every account and email every owner. Configuration faults are operator
    // errors: logged, counted, skipped. Platform failures (see "marks account as
    // BLOCKED when refresh fails" above) and auth-tag failures keep blocking.
    describe('encryption configuration faults', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('leaves the account untouched and notifies nobody on a config fault', async () => {
            jest.spyOn(Logger.prototype, 'error').mockImplementation(
                () => undefined
            );
            const faultyAccount = makeMockAccount({ id: 'account-1' });
            const healthyAccount = makeMockAccount({ id: 'account-2' });
            mockAccountRepository.findExpiringSoon.mockResolvedValue([
                faultyAccount,
                healthyAccount,
            ]);
            mockEncryption.envelopeDecrypt.mockImplementationOnce(() => {
                throw new TokenEncryptionError(
                    'key_not_found',
                    'Encryption key not found for keyId "v1"'
                );
            });

            await scheduler.handleTokenRefresh();

            expect(faultyAccount.status).toBe(ENUM_ACCOUNT_STATUS.ACTIVE);
            expect(
                mockNotificationService.createAccountBlocked
            ).not.toHaveBeenCalled();
            expect(mockCloudTasksClient.enqueue).not.toHaveBeenCalled();
            // The healthy account behind it is still refreshed and saved.
            expect(mockAccountRepository.save).toHaveBeenCalledTimes(1);
            expect(mockAccountRepository.save).toHaveBeenCalledWith(
                healthyAccount
            );
            expect(healthyAccount.accessToken).toBe(
                'enveloped:new-raw-access-token'
            );
            // `continue` must not skip the identity-map release.
            expect(mockUow.unsetIdentity).toHaveBeenCalledWith(faultyAccount);
        });

        it('still blocks and notifies when the envelope fails to authenticate', async () => {
            jest.spyOn(Logger.prototype, 'error').mockImplementation(
                () => undefined
            );
            const account = makeMockAccount();
            mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);
            mockEncryption.envelopeDecrypt.mockImplementationOnce(() => {
                throw new TokenEncryptionError(
                    'auth_failed',
                    'Envelope authentication failed'
                );
            });

            await scheduler.handleTokenRefresh();

            expect(account.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
            expect(mockAccountRepository.save).toHaveBeenCalledWith(account);
            expect(
                mockNotificationService.createAccountBlocked
            ).toHaveBeenCalled();
        });

        it('still blocks and notifies on a malformed envelope (invalid_format)', async () => {
            jest.spyOn(Logger.prototype, 'error').mockImplementation(
                () => undefined
            );
            const account = makeMockAccount();
            mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);
            mockEncryption.envelopeDecrypt.mockImplementationOnce(() => {
                throw new TokenEncryptionError(
                    'invalid_format',
                    'Malformed envelope'
                );
            });

            await scheduler.handleTokenRefresh();

            expect(account.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
            expect(mockAccountRepository.save).toHaveBeenCalledWith(account);
            expect(
                mockNotificationService.createAccountBlocked
            ).toHaveBeenCalled();
        });

        it('still blocks and notifies on an unsupported envelope version', async () => {
            jest.spyOn(Logger.prototype, 'error').mockImplementation(
                () => undefined
            );
            const account = makeMockAccount();
            mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);
            mockEncryption.envelopeDecrypt.mockImplementationOnce(() => {
                throw new TokenEncryptionError(
                    'unsupported_version',
                    'Unsupported envelope version'
                );
            });

            await scheduler.handleTokenRefresh();

            expect(account.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
            expect(mockAccountRepository.save).toHaveBeenCalledWith(account);
            expect(
                mockNotificationService.createAccountBlocked
            ).toHaveBeenCalled();
        });

        it('logs one run summary counting refreshed, blocked and config faults', async () => {
            const logSpy = jest
                .spyOn(Logger.prototype, 'log')
                .mockImplementation(() => undefined);
            jest.spyOn(Logger.prototype, 'error').mockImplementation(
                () => undefined
            );
            const configFaultAccount = makeMockAccount({ id: 'account-1' });
            const blockedAccount = makeMockAccount({ id: 'account-2' });
            const refreshedAccount = makeMockAccount({ id: 'account-3' });
            mockAccountRepository.findExpiringSoon.mockResolvedValue([
                configFaultAccount,
                blockedAccount,
                refreshedAccount,
            ]);
            mockEncryption.envelopeDecrypt.mockImplementationOnce(() => {
                throw new TokenEncryptionError(
                    'key_length',
                    'Encryption key is the wrong length'
                );
            });
            mockPlatformService.refreshCredentials
                .mockRejectedValueOnce(new Error('Token expired'))
                .mockResolvedValueOnce(mockRefreshResult);

            await scheduler.handleTokenRefresh();

            expect(logSpy).toHaveBeenCalledWith(
                'Token refresh run: refreshed 1, blocked 1, config faults 1'
            );
        });
    });
});

import { MikroORM } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Logger } from '@nestjs/common';
import { AccountRepository } from '../../../../src/modules/account/repository/repositories/account.repository';
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

    // Instagram refuses to refresh an expired token, so its 60-day tokens
    // are refreshed days ahead instead of inside the last half hour.
    it('refreshes Instagram tokens a week ahead', async () => {
        await scheduler.handleTokenRefresh();

        expect(mockAccountRepository.findExpiringSoon).toHaveBeenCalledWith(
            30,
            {
                types: [ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE],
                minutes: 7 * 24 * 60,
            }
        );
    });

    it('keeps an account active when an early refresh fails, to retry next run', async () => {
        const account = makeMockAccount({
            type: ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE,
            tokenExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        });
        mockAccountRepository.findExpiringSoon.mockResolvedValue([account]);
        mockPlatformService.refreshCredentials.mockRejectedValueOnce(
            new Error('Graph unavailable')
        );

        await scheduler.handleTokenRefresh();

        expect(account.status).toBe(ENUM_ACCOUNT_STATUS.ACTIVE);
        expect(mockAccountRepository.save).not.toHaveBeenCalled();
        expect(
            mockNotificationService.createAccountBlocked
        ).not.toHaveBeenCalled();
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
            'chatbot',
        ]);
        expect(
            mockNotificationService.createAccountBlocked
        ).toHaveBeenCalledWith(
            'owner-uuid-1',
            { id: 'account-uuid-1', name: 'My Zalo Account' },
            '/my-workspace/accounts'
        );
    });

    it('enqueues an ACCOUNT_BLOCKED email for the workspace owner when refresh fails', async () => {
        // In the language of the chatbot on the channel.
        const account = makeMockAccount({
            chatbot: { primaryLanguage: 'vi' },
        });
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
                    reconnectUrl: '/my-workspace/accounts',
                    language: 'vi',
                },
            },
            {
                taskName: expect.stringMatching(
                    /^ACCOUNT_BLOCKED-account-uuid-1-[0-9a-f-]{36}$/
                ),
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

        describe('run-level circuit breaker', () => {
            const authFailed = () => {
                throw new TokenEncryptionError(
                    'auth_failed',
                    'Envelope authentication failed'
                );
            };

            afterEach(() => {
                mockEncryption.envelopeDecrypt.mockImplementation(token =>
                    token.replace('enveloped:', '')
                );
            });

            it('writes and sends nothing when every account fails to decrypt, and logs one line with the reasons', async () => {
                const errorSpy = jest
                    .spyOn(Logger.prototype, 'error')
                    .mockImplementation(() => undefined);
                const accounts = [1, 2, 3].map(n =>
                    makeMockAccount({ id: `account-${n}` })
                );
                mockAccountRepository.findExpiringSoon.mockResolvedValue(
                    accounts
                );
                mockEncryption.envelopeDecrypt.mockImplementation(authFailed);

                await scheduler.handleTokenRefresh();

                for (const account of accounts) {
                    expect(account.status).toBe(ENUM_ACCOUNT_STATUS.ACTIVE);
                }
                expect(mockAccountRepository.save).not.toHaveBeenCalled();
                expect(
                    mockNotificationService.createAccountBlocked
                ).not.toHaveBeenCalled();
                expect(mockCloudTasksClient.enqueue).not.toHaveBeenCalled();
                expect(errorSpy).toHaveBeenCalledTimes(1);
                expect(errorSpy.mock.calls[0][0]).toContain(
                    'Token refresh aborted: 3/3 accounts failed to decrypt (auth_failed: 3)'
                );
                for (const account of accounts) {
                    expect(mockUow.unsetIdentity).toHaveBeenCalledWith(account);
                }
            });

            it('trips for a batch of two', async () => {
                jest.spyOn(Logger.prototype, 'error').mockImplementation(
                    () => undefined
                );
                const accounts = [1, 2].map(n =>
                    makeMockAccount({ id: `account-${n}` })
                );
                mockAccountRepository.findExpiringSoon.mockResolvedValue(
                    accounts
                );
                mockEncryption.envelopeDecrypt.mockImplementation(authFailed);

                await scheduler.handleTokenRefresh();

                expect(mockAccountRepository.save).not.toHaveBeenCalled();
                expect(
                    mockNotificationService.createAccountBlocked
                ).not.toHaveBeenCalled();
            });

            it('still blocks the failures when another account refreshed', async () => {
                jest.spyOn(Logger.prototype, 'error').mockImplementation(
                    () => undefined
                );
                const healthy = makeMockAccount({ id: 'account-1' });
                const dead = [2, 3].map(n =>
                    makeMockAccount({
                        id: `account-${n}`,
                        accessToken: 'corrupt',
                    })
                );
                mockAccountRepository.findExpiringSoon.mockResolvedValue([
                    healthy,
                    ...dead,
                ]);
                mockEncryption.envelopeDecrypt.mockImplementation(token => {
                    if (token === 'corrupt') authFailed();
                    return token.replace('enveloped:', '');
                });

                await scheduler.handleTokenRefresh();

                for (const account of dead) {
                    expect(account.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
                }
                expect(mockAccountRepository.save).toHaveBeenCalledTimes(3);
            });

            it('still blocks malformed rows (invalid_format), which a key change cannot cause', async () => {
                jest.spyOn(Logger.prototype, 'error').mockImplementation(
                    () => undefined
                );
                const accounts = [1, 2].map(n =>
                    makeMockAccount({ id: `account-${n}` })
                );
                mockAccountRepository.findExpiringSoon.mockResolvedValue(
                    accounts
                );
                mockEncryption.envelopeDecrypt.mockImplementation(() => {
                    throw new TokenEncryptionError(
                        'invalid_format',
                        'Malformed envelope'
                    );
                });

                await scheduler.handleTokenRefresh();

                for (const account of accounts) {
                    expect(account.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
                }
                expect(
                    mockNotificationService.createAccountBlocked
                ).toHaveBeenCalledTimes(2);
            });

            it('still logs the run summary when it trips', async () => {
                const logSpy = jest
                    .spyOn(Logger.prototype, 'log')
                    .mockImplementation(() => undefined);
                jest.spyOn(Logger.prototype, 'error').mockImplementation(
                    () => undefined
                );
                mockAccountRepository.findExpiringSoon.mockResolvedValue(
                    [1, 2].map(n => makeMockAccount({ id: `account-${n}` }))
                );
                mockEncryption.envelopeDecrypt.mockImplementation(authFailed);

                await scheduler.handleTokenRefresh();

                expect(logSpy).toHaveBeenCalledWith(
                    'Token refresh run: refreshed 0, blocked 0, config faults 0'
                );
            });

            it('still blocks and notifies both accounts in a mixed batch (one platform failure, one auth_failed)', async () => {
                jest.spyOn(Logger.prototype, 'error').mockImplementation(
                    () => undefined
                );
                const platformFailed = makeMockAccount({ id: 'account-1' });
                const undecryptable = makeMockAccount({
                    id: 'account-2',
                    accessToken: 'corrupt',
                });
                mockAccountRepository.findExpiringSoon.mockResolvedValue([
                    platformFailed,
                    undecryptable,
                ]);
                mockEncryption.envelopeDecrypt.mockImplementation(token => {
                    if (token === 'corrupt') authFailed();
                    return token.replace('enveloped:', '');
                });
                mockPlatformService.refreshCredentials.mockRejectedValueOnce(
                    new Error('Token expired')
                );

                await scheduler.handleTokenRefresh();

                expect(platformFailed.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
                expect(undecryptable.status).toBe(ENUM_ACCOUNT_STATUS.BLOCKED);
                expect(mockAccountRepository.save).toHaveBeenCalledTimes(2);
                expect(
                    mockNotificationService.createAccountBlocked
                ).toHaveBeenCalledTimes(2);
            });
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

// The query behind the scheduler's early refresh window.
describe('AccountRepository.findExpiringSoon', () => {
    const NOW = new Date('2026-10-12T10:00:00Z').getTime();
    let repo: AccountRepository;
    let find: jest.SpyInstance;

    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(NOW);
        repo = new AccountRepository({} as EntityManager);
        find = jest.spyOn(repo as any, 'find').mockResolvedValue([]);
    });

    afterEach(() => jest.restoreAllMocks());

    it('looks thresholdMinutes ahead for every account', async () => {
        await repo.findExpiringSoon(30);
        expect(find).toHaveBeenCalledWith({
            $or: [{ tokenExpiresAt: { $lte: new Date(NOW + 30 * 60_000) } }],
            status: { $ne: ENUM_ACCOUNT_STATUS.BLOCKED },
            deletedAt: null,
        });
    });

    it('looks further ahead for the types given an early window', async () => {
        await repo.findExpiringSoon(30, {
            types: [ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE],
            minutes: 7 * 24 * 60,
        });
        expect(find.mock.calls[0][0].$or).toEqual([
            { tokenExpiresAt: { $lte: new Date(NOW + 30 * 60_000) } },
            {
                type: { $in: [ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE] },
                tokenExpiresAt: {
                    $lte: new Date(NOW + 7 * 24 * 60 * 60_000),
                },
            },
        ]);
    });
});

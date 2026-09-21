import { MikroORM } from '@mikro-orm/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { PlatformWebhookEvent } from '@app/modules/platform/interfaces/platform-adapter.interface';
import { InboundInboxService } from '@app/modules/platform/services/inbound-inbox.service';
import { PlatformAdapterRegistry } from '@app/modules/platform/services/platform-adapter.registry';
import { InboundReconciliationScheduler } from '@app/modules/platform/schedulers/inbound-reconciliation.scheduler';

const makeAccount = (type = ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE): AccountEntity =>
    ({ id: 'acct-1', type }) as AccountEntity;

const makeEvent = (): PlatformWebhookEvent => ({
    kind: 'message',
    accountKey: 'page-id',
    senderId: 'user-psid',
    recipientId: 'page-id',
    externalMessageId: 'msg-1',
    text: 'hello',
    timestamp: new Date(),
    raw: {},
});

// instanceof MikroORM so @ContextualCron's @CreateRequestContext() context resolver accepts it.
const mockEm = { name: 'default', fork: jest.fn(() => ({ name: 'default' })) };
const mockOrm = Object.assign(Object.create(MikroORM.prototype), {
    em: mockEm,
});

describe('InboundReconciliationScheduler', () => {
    let scheduler: InboundReconciliationScheduler;
    let accountRepository: jest.Mocked<
        Pick<AccountRepository, 'findAllActive'>
    >;
    let registry: jest.Mocked<Pick<PlatformAdapterRegistry, 'has' | 'get'>>;
    let inbox: jest.Mocked<Pick<InboundInboxService, 'accept'>>;

    beforeEach(async () => {
        accountRepository = { findAllActive: jest.fn() };
        registry = { has: jest.fn(), get: jest.fn() };
        inbox = { accept: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InboundReconciliationScheduler,
                { provide: AccountRepository, useValue: accountRepository },
                { provide: PlatformAdapterRegistry, useValue: registry },
                { provide: InboundInboxService, useValue: inbox },
                { provide: MikroORM, useValue: mockOrm },
            ],
        }).compile();

        scheduler = module.get(InboundReconciliationScheduler);
    });

    it('calls inbox.accept for each reconciled event', async () => {
        const account = makeAccount();
        const event = makeEvent();
        accountRepository.findAllActive.mockResolvedValue([account]);
        registry.has.mockReturnValue(true);
        registry.get.mockReturnValue({
            reconcile: jest.fn().mockResolvedValue([event]),
        } as any);
        inbox.accept.mockResolvedValue('accepted');

        await scheduler.handleReconcile();

        expect(inbox.accept).toHaveBeenCalledTimes(1);
        expect(inbox.accept).toHaveBeenCalledWith(
            ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            event
        );
    });

    it('passes a lookback date ~25h in the past to reconcile', async () => {
        const account = makeAccount();
        const reconcile = jest.fn().mockResolvedValue([]);
        accountRepository.findAllActive.mockResolvedValue([account]);
        registry.has.mockReturnValue(true);
        registry.get.mockReturnValue({ reconcile } as any);

        const before = Date.now();
        await scheduler.handleReconcile();
        const after = Date.now();

        const lookback: Date = reconcile.mock.calls[0][1];
        const ageMs = before - lookback.getTime();
        expect(ageMs).toBeGreaterThanOrEqual(25 * 60 * 60 * 1000 - 100);
        expect(ageMs).toBeLessThanOrEqual(
            after - before + 25 * 60 * 60 * 1000 + 100
        );
    });

    it('skips account when adapter has no reconcile method', async () => {
        accountRepository.findAllActive.mockResolvedValue([makeAccount()]);
        registry.has.mockReturnValue(true);
        registry.get.mockReturnValue({} as any);

        await scheduler.handleReconcile();

        expect(inbox.accept).not.toHaveBeenCalled();
    });

    it('skips account not in registry', async () => {
        accountRepository.findAllActive.mockResolvedValue([makeAccount()]);
        registry.has.mockReturnValue(false);

        await scheduler.handleReconcile();

        expect(registry.get).not.toHaveBeenCalled();
        expect(inbox.accept).not.toHaveBeenCalled();
    });

    it('continues sweep when adapter.reconcile throws', async () => {
        const account = makeAccount();
        accountRepository.findAllActive.mockResolvedValue([account]);
        registry.has.mockReturnValue(true);
        registry.get.mockReturnValue({
            reconcile: jest.fn().mockRejectedValue(new Error('API down')),
        } as any);

        await expect(scheduler.handleReconcile()).resolves.not.toThrow();
        expect(inbox.accept).not.toHaveBeenCalled();
    });

    it('continues when inbox.accept throws for one event', async () => {
        const account = makeAccount();
        const events = [
            makeEvent(),
            { ...makeEvent(), externalMessageId: 'msg-2' },
        ];
        accountRepository.findAllActive.mockResolvedValue([account]);
        registry.has.mockReturnValue(true);
        registry.get.mockReturnValue({
            reconcile: jest.fn().mockResolvedValue(events),
        } as any);
        inbox.accept
            .mockRejectedValueOnce(new Error('Redis down'))
            .mockResolvedValueOnce('accepted');

        await expect(scheduler.handleReconcile()).resolves.not.toThrow();
        expect(inbox.accept).toHaveBeenCalledTimes(2);
    });
});

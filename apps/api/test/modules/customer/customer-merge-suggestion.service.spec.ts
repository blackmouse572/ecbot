import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS } from '../../../src/modules/customer/enums/customer.enum';
import { CustomerMergeSuggestionService } from '../../../src/modules/customer/services/customer-merge-suggestion.service';

// Unit tests for the CustomerMergeSuggestionService. We mock the EntityManager
// and the per-aggregate repositories so the test stays at the service level —
// the canonicalization, idempotency, and orchestration rules are pure logic
// that should hold independently of the ORM.

type Where = Record<string, any>;

function makeEm() {
    // Simple recorded-calls mock for the MikroORM EntityManager surface the
    // service touches.
    return {
        find: jest.fn(),
        findOne: jest.fn(),
        count: jest.fn(),
        persist: jest.fn(),
        persistAndFlush: jest.fn().mockResolvedValue(undefined),
        flush: jest.fn().mockResolvedValue(undefined),
        nativeUpdate: jest.fn().mockResolvedValue(0),
        getReference: jest.fn((_entity: any, id: string) => ({ id })),
        transactional: jest.fn(),
    } as any;
}

function makeService(em: any, suggestionRepo: any) {
    const customerRepo = {} as any;
    const contactPointRepo = {} as any;
    const tagAssignmentRepo = {} as any;
    const notificationService = { create: jest.fn().mockResolvedValue({}) };
    const workspaceMemberRepo = {
        findActiveByWorkspace: jest.fn().mockResolvedValue([]),
    };
    const service = new CustomerMergeSuggestionService(
        em,
        suggestionRepo,
        customerRepo,
        contactPointRepo,
        tagAssignmentRepo,
        notificationService as any,
        workspaceMemberRepo as any
    );
    return { service, notificationService, workspaceMemberRepo };
}

describe('CustomerMergeSuggestionService', () => {
    describe('detectAndUpsert', () => {
        it('skips when the value is null or empty string', async () => {
            const em = makeEm();
            const suggestionRepo = { findOneByPair: jest.fn() };
            const { service } = makeService(em, suggestionRepo);

            const r1 = await service.detectAndUpsert({
                workspaceId: 'ws-1',
                customerId: 'cust-1',
                field: 'phone',
                value: '',
            });
            const r2 = await service.detectAndUpsert({
                workspaceId: 'ws-1',
                customerId: 'cust-1',
                field: 'phone',
                value: null,
            });

            expect(r1).toEqual([]);
            expect(r2).toEqual([]);
            expect(em.find).not.toHaveBeenCalled();
            expect(suggestionRepo.findOneByPair).not.toHaveBeenCalled();
        });

        it('returns [] when no other customer matches the field value', async () => {
            const em = makeEm();
            em.find.mockResolvedValue([]); // no candidates
            const suggestionRepo = { findOneByPair: jest.fn() };
            const { service } = makeService(em, suggestionRepo);

            const result = await service.detectAndUpsert({
                workspaceId: 'ws-1',
                customerId: 'cust-1',
                field: 'phone',
                value: '0901',
            });

            expect(result).toEqual([]);
            // The em.find call filters with mergedIntoCustomerId: null so soft-
            // merged customers are excluded from the candidate set — assert it.
            const whereArg = em.find.mock.calls[0][1] as Where;
            expect(whereArg.mergedIntoCustomerId).toBeNull();
            expect(whereArg.deletedAt).toBeNull();
            expect(whereArg.id).toEqual({ $ne: 'cust-1' });
            expect(whereArg.phone).toBe('0901');
            expect(suggestionRepo.findOneByPair).not.toHaveBeenCalled();
        });

        it('canonicalizes the pair to (min(id), max(id)) regardless of which customerId is passed in', async () => {
            // Customer ids are sorted lexicographically — 'cust-A' < 'cust-B'.
            const em = makeEm();
            em.find.mockResolvedValue([{ id: 'cust-A' }]); // candidate
            const suggestionRepo = {
                findOneByPair: jest.fn().mockResolvedValue(null),
            };
            const { service } = makeService(em, suggestionRepo);

            // Caller invokes from the perspective of cust-B (the *changed* customer).
            await service.detectAndUpsert({
                workspaceId: 'ws-1',
                customerId: 'cust-B',
                field: 'phone',
                value: '0901',
            });

            expect(suggestionRepo.findOneByPair).toHaveBeenCalledWith(
                'ws-1',
                'cust-A',
                'cust-B',
                'phone'
            );
        });

        it('is idempotent — running twice for the same (pair, field) returns the same suggestion and creates no duplicate', async () => {
            const existing = {
                id: 'sugg-1',
                status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING,
            };
            const em = makeEm();
            em.find.mockResolvedValue([{ id: 'cust-A' }]); // candidate
            const suggestionRepo = {
                findOneByPair: jest.fn().mockResolvedValue(existing),
            };
            const { service, workspaceMemberRepo } = makeService(
                em,
                suggestionRepo
            );

            const r1 = await service.detectAndUpsert({
                workspaceId: 'ws-1',
                customerId: 'cust-B',
                field: 'phone',
                value: '0901',
            });
            const r2 = await service.detectAndUpsert({
                workspaceId: 'ws-1',
                customerId: 'cust-B',
                field: 'phone',
                value: '0901',
            });

            expect(r1[0]).toBe(existing);
            expect(r2[0]).toBe(existing);
            // persistAndFlush should NEVER be called when the suggestion exists.
            expect(em.persistAndFlush).not.toHaveBeenCalled();
            // No new notification on second invocation.
            expect(
                workspaceMemberRepo.findActiveByWorkspace
            ).not.toHaveBeenCalled();
        });

        it('on first-time creation persists the suggestion AND fires the operator notification', async () => {
            const em = makeEm();
            em.find.mockResolvedValue([{ id: 'cust-A' }]); // candidate
            const suggestionRepo = {
                findOneByPair: jest.fn().mockResolvedValue(null),
            };
            const { service, notificationService, workspaceMemberRepo } =
                makeService(em, suggestionRepo);
            workspaceMemberRepo.findActiveByWorkspace.mockResolvedValue([
                { user: { id: 'user-1' } },
                { user: { id: 'user-2' } },
            ]);

            const result = await service.detectAndUpsert({
                workspaceId: 'ws-1',
                customerId: 'cust-B',
                field: 'phone',
                value: '0901',
            });

            expect(result).toHaveLength(1);
            expect(em.persistAndFlush).toHaveBeenCalledTimes(1);
            // notifyOperators is fired-and-forgotten — let microtasks settle.
            await new Promise(setImmediate);
            expect(notificationService.create).toHaveBeenCalledTimes(2);
            const firstCall = notificationService.create.mock.calls[0][0];
            expect(firstCall.recipient).toBe('user-1');
            expect(firstCall.metadata.data.customerAId).toBe('cust-A');
            expect(firstCall.metadata.data.customerBId).toBe('cust-B');
        });

        it('excludes merged-away (mergedIntoCustomerId set) candidates via the EM filter', async () => {
            const em = makeEm();
            em.find.mockResolvedValue([]);
            const suggestionRepo = { findOneByPair: jest.fn() };
            const { service } = makeService(em, suggestionRepo);

            await service.detectAndUpsert({
                workspaceId: 'ws-1',
                customerId: 'cust-1',
                field: 'email',
                value: 'a@b.co',
            });

            const filter = em.find.mock.calls[0][1] as Where;
            expect(filter.mergedIntoCustomerId).toBeNull();
            expect(filter.deletedAt).toBeNull();
        });
    });

    describe('dismiss', () => {
        it('sets status=DISMISSED and resolvedAt, then persists', async () => {
            const em = makeEm();
            const sugg = {
                id: 'sugg-1',
                status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING,
                resolvedAt: null,
            };
            em.findOne.mockResolvedValue(sugg);
            const { service } = makeService(em, {});

            const result = await service.dismiss('sugg-1', 'ws-1');

            expect(result.status).toBe(
                ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.DISMISSED
            );
            expect(result.resolvedAt).toBeInstanceOf(Date);
            expect(em.persistAndFlush).toHaveBeenCalled();
        });

        it('throws BadRequestException when the suggestion is not PENDING', async () => {
            const em = makeEm();
            em.findOne.mockResolvedValue({
                id: 'sugg-1',
                status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.DISMISSED,
            });
            const { service } = makeService(em, {});

            await expect(
                service.dismiss('sugg-1', 'ws-1')
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('throws NotFoundException when the suggestion is missing', async () => {
            const em = makeEm();
            em.findOne.mockResolvedValue(null);
            const { service } = makeService(em, {});

            await expect(
                service.dismiss('sugg-nope', 'ws-1')
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('confirmMerge', () => {
        // Build a transactional EM stub whose `find/findOne/persist/nativeUpdate`
        // are the same recorded mocks we can assert against. The service's outer
        // `em.transactional(async tem => …)` is invoked with this tem.
        function makeTransactionalEm() {
            const tem = {
                find: jest.fn(),
                findOne: jest.fn(),
                persist: jest.fn(),
                nativeUpdate: jest.fn().mockResolvedValue(0),
                flush: jest.fn().mockResolvedValue(undefined),
                getReference: jest.fn((_entity: any, id: string) => ({ id })),
            };
            const em = makeEm();
            em.transactional = jest.fn(async (cb: any) => cb(tem));
            return { em, tem };
        }

        const sugg = (overrides: any = {}) => ({
            id: 'sugg-1',
            status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.PENDING,
            customerA: { id: 'cust-A' },
            customerB: { id: 'cust-B' },
            ...overrides,
        });

        it('throws BadRequestException when survivorId is neither customerA nor customerB', async () => {
            const { em, tem } = makeTransactionalEm();
            tem.findOne.mockResolvedValueOnce(sugg());
            const { service } = makeService(em, {});

            await expect(
                service.confirmMerge('sugg-1', 'ws-1', {
                    survivorId: 'cust-OTHER',
                })
            ).rejects.toBeInstanceOf(BadRequestException);
        });

        it('throws NotFoundException when the suggestion is missing', async () => {
            const { em, tem } = makeTransactionalEm();
            tem.findOne.mockResolvedValueOnce(null);
            const { service } = makeService(em, {});

            await expect(
                service.confirmMerge('sugg-1', 'ws-1', { survivorId: 'cust-A' })
            ).rejects.toBeInstanceOf(NotFoundException);
        });

        it('happy path: reparents ContactPoints, unions tag assignments, soft-deletes the loser with mergedIntoCustomerId, captures unmergeSnapshot, sets status=MERGED', async () => {
            const { em, tem } = makeTransactionalEm();
            const suggestion = sugg();
            const survivor = {
                id: 'cust-A',
                name: 'Survivor',
                phone: 's-phone',
                email: 's-email',
            };
            const loser = {
                id: 'cust-B',
                name: 'Loser',
                phone: 'l-phone',
                email: 'l-email',
            };

            // findOne order: suggestion, survivor, loser; later in the loop a
            // per-tag survivorHas lookup is needed.
            tem.findOne
                .mockResolvedValueOnce(suggestion) // suggestion
                .mockResolvedValueOnce(survivor) // survivor
                .mockResolvedValueOnce(loser) // loser
                .mockResolvedValueOnce(null); // survivorHas for tag

            // Loser tag assignments
            tem.find
                .mockResolvedValueOnce([{ id: 'assn-1', tag: { id: 'tag-1' } }]) // loserAssignments
                .mockResolvedValueOnce([{ id: 'cp-1' }, { id: 'cp-2' }]); // loserContactPoints

            const { service } = makeService(em, {});

            const result = await service.confirmMerge('sugg-1', 'ws-1', {
                survivorId: 'cust-A',
            });

            expect(result).toEqual({
                survivorId: 'cust-A',
                loserId: 'cust-B',
            });

            // 1) ContactPoints reparented via nativeUpdate from loser -> survivor.
            const cpUpdate = tem.nativeUpdate.mock.calls.find(
                ([entity, where]: any) =>
                    where?.customer === 'cust-B' ||
                    entity?.name?.includes?.('ContactPoint')
            );
            expect(cpUpdate).toBeDefined();

            // 2) A new survivor-side assignment is persisted for the loser's tag.
            const persistedAssignments = tem.persist.mock.calls.filter(
                ([arg]: any) =>
                    arg?.tag?.id === 'tag-1' && arg?.customer?.id === 'cust-A'
            );
            expect(persistedAssignments.length).toBeGreaterThan(0);

            // 3) Loser is soft-deleted with mergedIntoCustomerId = survivor.id.
            expect((loser as any).mergedIntoCustomerId).toBe('cust-A');
            expect((loser as any).deletedAt).toBeInstanceOf(Date);
            expect((loser as any).deleted).toBe(true);

            // 4) Suggestion updated.
            expect(suggestion.status).toBe(
                ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.MERGED
            );
            expect((suggestion as any).mergedSurvivorId).toBe('cust-A');
            expect((suggestion as any).mergedLoserId).toBe('cust-B');
            expect((suggestion as any).unmergeSnapshot).toBeDefined();
            expect(
                (suggestion as any).unmergeSnapshot.loserContactPointIds
            ).toEqual(['cp-1', 'cp-2']);
            expect(
                (suggestion as any).unmergeSnapshot.loserTagAssignmentIds
            ).toEqual(['assn-1']);
            expect((suggestion as any).unmergeSnapshot.loserFields.name).toBe(
                'Loser'
            );
            expect((suggestion as any).unmergeSnapshot.loserFields.phone).toBe(
                'l-phone'
            );

            // 5) Final flush.
            expect(tem.flush).toHaveBeenCalled();
        });

        it("applies field resolutions onto the survivor — choosing the A-side value lands as the survivor's value", async () => {
            const { em, tem } = makeTransactionalEm();
            const suggestion = sugg();
            // Survivor is A — choosing 'A' for `name` keeps the survivor's
            // value; choosing 'B' should replace it with the loser's value.
            const survivor = {
                id: 'cust-A',
                name: 'A-name',
                phone: 'A-phone',
                email: null,
            };
            const loser = {
                id: 'cust-B',
                name: 'B-name',
                phone: 'B-phone',
                email: 'B-email',
            };

            tem.findOne
                .mockResolvedValueOnce(suggestion)
                .mockResolvedValueOnce(survivor)
                .mockResolvedValueOnce(loser);

            tem.find.mockResolvedValueOnce([]); // no loser tags
            tem.find.mockResolvedValueOnce([]); // no contact points

            const { service } = makeService(em, {});

            await service.confirmMerge('sugg-1', 'ws-1', {
                survivorId: 'cust-A',
                fieldResolutions: {
                    name: 'B', // pick loser's value
                    phone: 'A', // keep survivor's value
                    email: 'B', // pick loser's value
                },
            });

            expect((survivor as any).name).toBe('B-name');
            expect((survivor as any).phone).toBe('A-phone');
            expect((survivor as any).email).toBe('B-email');
        });
    });

    describe('unmerge', () => {
        function makeTransactionalEm() {
            const tem = {
                find: jest.fn(),
                findOne: jest.fn(),
                persist: jest.fn(),
                nativeUpdate: jest.fn().mockResolvedValue(0),
                flush: jest.fn().mockResolvedValue(undefined),
                getReference: jest.fn((_entity: any, id: string) => ({ id })),
            };
            const em = makeEm();
            em.transactional = jest.fn(async (cb: any) => cb(tem));
            return { em, tem };
        }

        it('restores loser fields + ContactPoints + tag assignments from the snapshot and flips the suggestion to DISMISSED', async () => {
            const { em, tem } = makeTransactionalEm();
            const suggestion = {
                id: 'sugg-1',
                status: ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.MERGED,
                mergedSurvivorId: 'cust-A',
                mergedLoserId: 'cust-B',
                unmergeSnapshot: {
                    loserContactPointIds: ['cp-1'],
                    loserTagAssignmentIds: ['assn-1'],
                    loserFields: {
                        name: 'Loser was here',
                        phone: 'l-phone',
                        email: null,
                    },
                },
            };
            const loser = {
                id: 'cust-B',
                name: 'should be overwritten',
                phone: 'should be overwritten',
                mergedIntoCustomerId: 'cust-A',
                deletedAt: new Date(),
                deleted: true,
            };
            tem.findOne
                .mockResolvedValueOnce(suggestion) // suggestion
                .mockResolvedValueOnce(loser); // loser
            const { service } = makeService(em, {});

            await service.unmerge('cust-A', 'ws-1');

            // Loser restored
            expect((loser as any).mergedIntoCustomerId).toBeNull();
            expect((loser as any).deletedAt).toBeNull();
            expect((loser as any).deleted).toBe(false);
            expect((loser as any).name).toBe('Loser was here');
            expect((loser as any).phone).toBe('l-phone');

            // ContactPoints reparented BACK to loser
            const cpReparent = tem.nativeUpdate.mock.calls.find(
                ([, where, patch]: any) =>
                    where?.id?.$in?.includes?.('cp-1') &&
                    patch?.customer?.id === 'cust-B'
            );
            expect(cpReparent).toBeDefined();

            // Tag assignments un-soft-deleted
            const tagRestore = tem.nativeUpdate.mock.calls.find(
                ([, where, patch]: any) =>
                    where?.id?.$in?.includes?.('assn-1') &&
                    patch?.deletedAt === null
            );
            expect(tagRestore).toBeDefined();

            // Suggestion flipped to DISMISSED, NOT back to PENDING.
            expect(suggestion.status).toBe(
                ENUM_CUSTOMER_MERGE_SUGGESTION_STATUS.DISMISSED
            );
            expect((suggestion as any).resolvedAt).toBeInstanceOf(Date);
        });

        it('throws NotFoundException when there is no merged suggestion involving this customer', async () => {
            const { em, tem } = makeTransactionalEm();
            tem.findOne.mockResolvedValueOnce(null);
            const { service } = makeService(em, {});

            await expect(
                service.unmerge('cust-X', 'ws-1')
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });
});

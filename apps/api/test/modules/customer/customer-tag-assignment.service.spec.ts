import { NotFoundException } from '@nestjs/common';
import { CustomerTagAssignmentService } from '../../../src/modules/customer/services/customer-tag-assignment.service';

describe('CustomerTagAssignmentService', () => {
    let service: CustomerTagAssignmentService;

    const mockEm = {
        persistAndFlush: jest.fn(),
        flush: jest.fn(),
        getReference: jest.fn((cls: any, id: string) => ({ id })),
    };

    const mockCustomerRepository = {
        findOneById: jest.fn(),
    };

    const mockCustomerTagRepository = {
        findOneById: jest.fn(),
    };

    const mockCustomerTagAssignmentRepository = {
        findByCustomer: jest.fn(),
        findOne: jest.fn(),
        findOneByCustomerAndTag: jest.fn(),
        softDelete: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CustomerTagAssignmentService(
            mockEm as any,
            mockCustomerRepository as any,
            mockCustomerTagRepository as any,
            mockCustomerTagAssignmentRepository as any
        );
    });

    describe('apply', () => {
        it('creates an assignment for a fresh (customer, tag) pair', async () => {
            mockCustomerRepository.findOneById.mockResolvedValue({
                id: 'cust-1',
            });
            mockCustomerTagRepository.findOneById.mockResolvedValue({
                id: 'tag-1',
            });
            // live lookup: no active assignment; full lookup: no soft-deleted
            // row either; then reload with populated tag after insert
            mockCustomerTagAssignmentRepository.findOne.mockResolvedValue(null);
            mockCustomerTagAssignmentRepository.findOneByCustomerAndTag
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({
                    id: 'assn-1',
                    customer: { id: 'cust-1' },
                    tag: { id: 'tag-1' },
                });
            mockEm.persistAndFlush.mockResolvedValue(undefined);

            const result = await service.apply('cust-1', 'tag-1');

            expect(mockEm.persistAndFlush).toHaveBeenCalledTimes(1);
            const [persisted] = mockEm.persistAndFlush.mock.calls[0];
            expect(persisted.customer).toEqual({ id: 'cust-1' });
            expect(persisted.tag).toEqual({ id: 'tag-1' });
            expect(result.id).toBe('assn-1');
        });

        it('is idempotent — re-applying the same (customer, tag) pair returns the existing assignment, does NOT throw, does NOT write a new row', async () => {
            const existing = {
                id: 'assn-existing',
                customer: { id: 'cust-1' },
                tag: { id: 'tag-1' },
            };
            mockCustomerRepository.findOneById.mockResolvedValue({
                id: 'cust-1',
            });
            mockCustomerTagRepository.findOneById.mockResolvedValue({
                id: 'tag-1',
            });
            mockCustomerTagAssignmentRepository.findOneByCustomerAndTag.mockResolvedValue(
                existing
            );

            const result = await service.apply('cust-1', 'tag-1');

            expect(result).toBe(existing);
            expect(mockEm.persistAndFlush).not.toHaveBeenCalled();
        });

        it('restores the soft-deleted row when re-applying after remove — no insert, no 500', async () => {
            const removed = {
                id: 'assn-removed',
                deleted: true,
                deletedAt: new Date(),
            };
            const restored = {
                id: 'assn-removed',
                customer: { id: 'cust-1' },
                tag: { id: 'tag-1' },
            };
            mockCustomerRepository.findOneById.mockResolvedValue({
                id: 'cust-1',
            });
            mockCustomerTagRepository.findOneById.mockResolvedValue({
                id: 'tag-1',
            });
            // live lookup misses (soft-deleted rows are filtered out)
            mockCustomerTagAssignmentRepository.findOneByCustomerAndTag
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(restored);
            mockCustomerTagAssignmentRepository.findOne.mockResolvedValue(
                removed
            );
            mockEm.flush.mockResolvedValue(undefined);

            const result = await service.apply('cust-1', 'tag-1');

            expect(result).toBe(restored);
            expect(removed.deleted).toBe(false);
            expect(removed.deletedAt).toBeNull();
            expect(mockEm.flush).toHaveBeenCalledTimes(1);
            expect(mockEm.persistAndFlush).not.toHaveBeenCalled();
        });

        it('returns the winner when a concurrent double-submit hits the unique constraint — no 500', async () => {
            const winner = {
                id: 'assn-winner',
                customer: { id: 'cust-1' },
                tag: { id: 'tag-1' },
            };
            mockCustomerRepository.findOneById.mockResolvedValue({
                id: 'cust-1',
            });
            mockCustomerTagRepository.findOneById.mockResolvedValue({
                id: 'tag-1',
            });
            mockCustomerTagAssignmentRepository.findOneByCustomerAndTag
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(winner);
            mockCustomerTagAssignmentRepository.findOne.mockResolvedValue(null);
            mockEm.persistAndFlush.mockRejectedValue(
                Object.assign(new Error('duplicate key value'), {
                    code: '23505',
                })
            );

            const result = await service.apply('cust-1', 'tag-1');

            expect(result).toBe(winner);
        });

        it('throws NotFoundException when the customer does not exist', async () => {
            mockCustomerRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.apply('cust-missing', 'tag-1')
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(mockEm.persistAndFlush).not.toHaveBeenCalled();
        });

        it('throws NotFoundException when the tag does not exist', async () => {
            mockCustomerRepository.findOneById.mockResolvedValue({
                id: 'cust-1',
            });
            mockCustomerTagRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.apply('cust-1', 'tag-missing')
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(mockEm.persistAndFlush).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it('soft-deletes the existing assignment for the (customer, tag) pair', async () => {
            mockCustomerTagAssignmentRepository.findOneByCustomerAndTag.mockResolvedValue(
                { id: 'assn-1' }
            );

            await service.remove('cust-1', 'tag-1');

            expect(
                mockCustomerTagAssignmentRepository.softDelete
            ).toHaveBeenCalledWith({ id: 'assn-1' });
        });

        it('is a no-op (no throw) when no assignment exists for the pair', async () => {
            mockCustomerTagAssignmentRepository.findOneByCustomerAndTag.mockResolvedValue(
                null
            );

            await expect(service.remove('cust-1', 'tag-1')).resolves.toBeNull();
            expect(
                mockCustomerTagAssignmentRepository.softDelete
            ).not.toHaveBeenCalled();
        });
    });

    describe('listByCustomer', () => {
        it('returns assignments populated with the tag entity (so chips can render emoji + name)', async () => {
            const assignments = [
                {
                    id: 'assn-1',
                    customer: { id: 'cust-1' },
                    tag: { id: 'tag-1', name: 'VIP', emoji: '⭐' },
                },
                {
                    id: 'assn-2',
                    customer: { id: 'cust-1' },
                    tag: { id: 'tag-2', name: 'Hot lead', emoji: '🔥' },
                },
            ];
            mockCustomerTagAssignmentRepository.findByCustomer.mockResolvedValue(
                assignments
            );

            const result = await service.listByCustomer('cust-1');

            expect(
                mockCustomerTagAssignmentRepository.findByCustomer
            ).toHaveBeenCalledWith('cust-1');
            expect(result).toBe(assignments);
            expect(result[0].tag.name).toBe('VIP');
            expect(result[1].tag.emoji).toBe('🔥');
        });
    });
});

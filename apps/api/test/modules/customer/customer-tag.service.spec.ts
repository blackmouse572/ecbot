import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomerTagService } from '../../../src/modules/customer/services/customer-tag.service';

describe('CustomerTagService', () => {
    let service: CustomerTagService;

    const mockEm = {
        findOne: jest.fn(),
        persistAndFlush: jest.fn(),
        getReference: jest.fn((cls: any, id: string) => ({ id })),
    };

    const mockCustomerTagRepository = {
        findByWorkspace: jest.fn(),
        findOneById: jest.fn(),
        updateEntity: jest.fn(),
        softDelete: jest.fn(),
    };

    const mockCustomerTagAssignmentRepository = {
        findByTag: jest.fn(),
        softDelete: jest.fn(),
        updateMany: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CustomerTagService(
            mockEm as any,
            mockCustomerTagRepository as any,
            mockCustomerTagAssignmentRepository as any
        );
    });

    describe('create', () => {
        it('persists a tag with the provided fields and returns it', async () => {
            mockEm.findOne.mockResolvedValue(null);
            mockEm.persistAndFlush.mockResolvedValue(undefined);

            const result = await service.create({
                workspace: 'ws-1',
                name: 'VIP',
                emoji: '⭐',
                description: 'High value',
                triggersHandoff: false,
            });

            expect(mockEm.persistAndFlush).toHaveBeenCalledTimes(1);
            const [persisted] = mockEm.persistAndFlush.mock.calls[0];
            expect(persisted.name).toBe('VIP');
            expect(persisted.emoji).toBe('⭐');
            expect(persisted.description).toBe('High value');
            expect(persisted.triggersHandoff).toBe(false);
            expect(persisted.workspace).toEqual({ id: 'ws-1' });
            expect(result).toBe(persisted);
        });

        it('defaults triggersHandoff to false when omitted', async () => {
            mockEm.findOne.mockResolvedValue(null);
            mockEm.persistAndFlush.mockResolvedValue(undefined);

            await service.create({ workspace: 'ws-1', name: 'Hot lead' });

            const [persisted] = mockEm.persistAndFlush.mock.calls[0];
            expect(persisted.triggersHandoff).toBe(false);
        });

        it('throws a meaningful conflict when a tag with the same name already exists in the workspace', async () => {
            mockEm.findOne.mockResolvedValue({ id: 'existing', name: 'VIP' });

            await expect(
                service.create({ workspace: 'ws-1', name: 'VIP' })
            ).rejects.toBeInstanceOf(ConflictException);
            expect(mockEm.persistAndFlush).not.toHaveBeenCalled();
        });

        it('scopes the duplicate check by workspace + name + non-deleted', async () => {
            mockEm.findOne.mockResolvedValue(null);
            mockEm.persistAndFlush.mockResolvedValue(undefined);

            await service.create({ workspace: 'ws-1', name: 'VIP' });

            const [, filter] = mockEm.findOne.mock.calls[0];
            expect(filter.workspace).toBe('ws-1');
            expect(filter.name).toBe('VIP');
            expect(filter.deletedAt).toBeNull();
        });
    });

    describe('update', () => {
        it('writes only the fields that were provided', async () => {
            mockCustomerTagRepository.findOneById.mockResolvedValue({
                id: 'tag-1',
            });
            mockCustomerTagRepository.updateEntity.mockResolvedValue({
                id: 'tag-1',
                name: 'New name',
            });

            await service.update('tag-1', { name: 'New name' });

            const [filter, patch] =
                mockCustomerTagRepository.updateEntity.mock.calls[0];
            expect(filter).toEqual({ id: 'tag-1' });
            expect(patch).toEqual({ name: 'New name' });
            expect(Object.keys(patch)).toEqual(['name']);
        });

        it('writes every supplied field — name, emoji, description, triggersHandoff', async () => {
            mockCustomerTagRepository.findOneById.mockResolvedValue({
                id: 'tag-1',
            });
            mockCustomerTagRepository.updateEntity.mockResolvedValue({
                id: 'tag-1',
            });

            await service.update('tag-1', {
                name: 'Angry',
                emoji: '🚨',
                description: 'upset',
                triggersHandoff: true,
            });

            const [, patch] =
                mockCustomerTagRepository.updateEntity.mock.calls[0];
            expect(patch).toEqual({
                name: 'Angry',
                emoji: '🚨',
                description: 'upset',
                triggersHandoff: true,
            });
        });

        it('throws NotFoundException when the tag does not exist', async () => {
            mockCustomerTagRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.update('tag-missing', { name: 'x' })
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(
                mockCustomerTagRepository.updateEntity
            ).not.toHaveBeenCalled();
        });

        it('throws NotFoundException when the update returns null (race / concurrent delete)', async () => {
            mockCustomerTagRepository.findOneById.mockResolvedValue({
                id: 'tag-1',
            });
            mockCustomerTagRepository.updateEntity.mockResolvedValue(null);

            await expect(
                service.update('tag-1', { name: 'x' })
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('delete', () => {
        it('soft-deletes the tag AND every assignment that pointed at it in ONE bulk update (cascade, no N+1)', async () => {
            mockCustomerTagRepository.findOneById.mockResolvedValue({
                id: 'tag-1',
            });

            await service.delete('tag-1');

            // Single bulk soft-delete of all assignments matching the tag —
            // the prior N+1 loop is gone (PR #173 review).
            expect(
                mockCustomerTagAssignmentRepository.updateMany
            ).toHaveBeenCalledTimes(1);
            const [filter, patch] =
                mockCustomerTagAssignmentRepository.updateMany.mock.calls[0];
            expect(filter).toMatchObject({ tag: 'tag-1', deletedAt: null });
            expect(patch.deleted).toBe(true);
            expect(patch.deletedAt).toBeInstanceOf(Date);

            // Tag itself soft-deleted
            expect(mockCustomerTagRepository.softDelete).toHaveBeenCalledWith({
                id: 'tag-1',
            });
        });

        it('still deletes the tag when there are no assignments — the bulk update is a safe no-op', async () => {
            mockCustomerTagRepository.findOneById.mockResolvedValue({
                id: 'tag-1',
            });

            await service.delete('tag-1');

            // updateMany still runs once; with no matches it affects zero rows
            // — the bulk path is unconditional and idempotent.
            expect(
                mockCustomerTagAssignmentRepository.updateMany
            ).toHaveBeenCalledTimes(1);
            expect(mockCustomerTagRepository.softDelete).toHaveBeenCalledWith({
                id: 'tag-1',
            });
        });

        it('throws NotFoundException when the tag does not exist', async () => {
            mockCustomerTagRepository.findOneById.mockResolvedValue(null);

            await expect(service.delete('tag-missing')).rejects.toBeInstanceOf(
                NotFoundException
            );
            expect(mockCustomerTagRepository.softDelete).not.toHaveBeenCalled();
            expect(
                mockCustomerTagAssignmentRepository.updateMany
            ).not.toHaveBeenCalled();
        });
    });

    describe('findAllByWorkspace', () => {
        it('returns active (non-deleted) tags scoped to the workspace', async () => {
            const tags = [
                { id: 'tag-a', name: 'VIP' },
                { id: 'tag-b', name: 'Hot lead' },
            ];
            mockCustomerTagRepository.findByWorkspace.mockResolvedValue(tags);

            const result = await service.findAllByWorkspace('ws-1');

            expect(
                mockCustomerTagRepository.findByWorkspace
            ).toHaveBeenCalledWith('ws-1', undefined, undefined);
            expect(result).toBe(tags);
        });
    });

    describe('findOne', () => {
        it('returns the tag by id', async () => {
            const tag = { id: 'tag-1', name: 'VIP' };
            mockCustomerTagRepository.findOneById.mockResolvedValue(tag);

            const result = await service.findOne('tag-1');

            expect(mockCustomerTagRepository.findOneById).toHaveBeenCalledWith(
                'tag-1',
                undefined
            );
            expect(result).toBe(tag);
        });

        it('returns null when the tag does not exist', async () => {
            mockCustomerTagRepository.findOneById.mockResolvedValue(null);

            const result = await service.findOne('tag-missing');

            expect(result).toBeNull();
        });
    });
});

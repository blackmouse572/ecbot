import { ConflictException } from '@nestjs/common';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { EntityManager } from '@mikro-orm/postgresql';

describe('AccountRepository.upsert', () => {
    let repo: AccountRepository;
    let em: { persistAndFlush: jest.Mock; create: jest.Mock };

    beforeEach(() => {
        em = {
            persistAndFlush: jest.fn().mockResolvedValue(undefined),
            create: jest.fn((_entity, data) => ({ ...data })),
        };
        repo = new AccountRepository(em as unknown as EntityManager);
    });

    // Regression test: unlinking an account with conversation history now
    // soft-deletes it (deletedAt set) instead of removing the row. Relinking
    // the same externalId must reactivate that row, not leave it "deleted".
    it('clears deletedAt when reactivating an existing account matched by externalId', async () => {
        const existing = {
            id: 'account-1',
            externalId: 'ext-1',
            deletedAt: new Date('2026-01-01'),
        } as AccountEntity;
        jest.spyOn(repo as any, 'findOne').mockResolvedValue(existing);

        const result = await repo.upsert({
            externalId: 'ext-1',
            name: 'New Name',
        } as Partial<AccountEntity>);

        expect(result.deletedAt).toBeNull();
    });

    it('creates a new account when no existing row matches externalId', async () => {
        jest.spyOn(repo as any, 'findOne').mockResolvedValue(null);

        await repo.upsert({
            externalId: 'ext-2',
            name: 'Fresh',
        } as Partial<AccountEntity>);

        expect(em.create).toHaveBeenCalled();
    });

    // Regression: an externalId re-linked under a different workspace must
    // not silently move the account (and its conversation history) between
    // tenants — this is how a hijacked externalId would steal an account.
    it('throws ConflictException when the same externalId already belongs to a different workspace', async () => {
        const existing = {
            id: 'account-1',
            externalId: 'ext-1',
            workspace: { id: 'workspace-1' },
            deletedAt: null,
        } as AccountEntity;
        jest.spyOn(repo as any, 'findOne').mockResolvedValue(existing);

        await expect(
            repo.upsert({
                externalId: 'ext-1',
                workspace: { id: 'workspace-2' } as any,
                name: 'Hijacked',
            } as Partial<AccountEntity>)
        ).rejects.toThrow(ConflictException);

        expect(em.persistAndFlush).not.toHaveBeenCalled();
    });
});

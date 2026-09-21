import { createHash } from 'crypto';
import { ClientCredentialService } from '../../../src/modules/client-credential/services/client-credential.service';

function makeService() {
    const sha256 = (v: string) =>
        createHash('sha256').update(v).digest('hex');

    const repository = { save: jest.fn(async (row: any) => row) };

    const service = new ClientCredentialService(
        { get: () => 'test' } as any,
        { random: (n: number) => `r${'a'.repeat(n - 1)}` } as any,
        {
            sha256,
            sha256Compare: (a: string, b: string) => a === b,
        } as any,
        { create: () => new Date() } as any,
        repository as any
    );

    return { service, repository, sha256 };
}

describe('ClientCredentialService.rotate', () => {
    it('keeps the key and issues a new secret', async () => {
        const { service, sha256 } = makeService();
        const credential = {
            id: 'cc-1',
            key: 'test_abcdefg',
            hash: sha256('test_abcdefg:old-secret'),
            isActive: true,
        } as any;

        const result = await service.rotate(credential, 'user-1');

        expect(result.id).toBe('cc-1');
        expect(result.key).toBe('test_abcdefg');
        expect(result.secret).toEqual(expect.any(String));
        expect(result.secret).not.toBe('old-secret');
    });

    it('invalidates the previous secret', async () => {
        const { service, sha256 } = makeService();
        const oldHash = sha256('test_abcdefg:old-secret');
        const credential = {
            id: 'cc-1',
            key: 'test_abcdefg',
            hash: oldHash,
            isActive: true,
        } as any;

        await service.rotate(credential, 'user-1');

        expect(credential.hash).not.toBe(oldHash);
        // The old secret no longer validates against the stored hash.
        const oldAttempt = await service.createHash(
            'test_abcdefg',
            'old-secret'
        );
        expect(
            await service.validateHash(oldAttempt, credential.hash)
        ).toBe(false);
    });

    it('stores a hash the new secret validates against', async () => {
        const { service } = makeService();
        const credential = {
            id: 'cc-1',
            key: 'test_abcdefg',
            hash: 'stale',
            isActive: true,
        } as any;

        const { secret } = await service.rotate(credential, 'user-1');

        const attempt = await service.createHash('test_abcdefg', secret);
        expect(await service.validateHash(attempt, credential.hash)).toBe(
            true
        );
    });

    it('persists via the repository, stamping the actor', async () => {
        const { service, repository } = makeService();
        const credential = {
            id: 'cc-1',
            key: 'test_abcdefg',
            hash: 'stale',
            isActive: true,
        } as any;

        await service.rotate(credential, 'user-1');

        expect(repository.save).toHaveBeenCalledWith(credential, {
            actionBy: 'user-1',
        });
    });
});

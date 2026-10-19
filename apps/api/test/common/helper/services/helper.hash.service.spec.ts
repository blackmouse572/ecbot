import { HelperHashService } from '../../../../src/common/helper/services/helper.hash.service';

// Made by bcryptjs (the library this service used before), cost 12. Every
// stored password hash looks like this, so it must keep verifying.
const BCRYPTJS_HASH =
    '$2b$12$7h8fVhgeM2bD0rQ/64T6yOMnJHvi3H2/5oMGYi.CIPdg35uAvg0k2';

describe('HelperHashService passwords', () => {
    const service = new HelperHashService();

    it('hashes new passwords with argon2id', async () => {
        const hashed = await service.passwordHash('secret');

        expect(hashed.startsWith('$argon2id$')).toBe(true);
        await expect(service.passwordVerify('secret', hashed)).resolves.toBe(
            true
        );
        await expect(service.passwordVerify('wrong', hashed)).resolves.toBe(
            false
        );
        expect(service.passwordNeedsRehash(hashed)).toBe(false);
    });

    it('still verifies passwords hashed by bcrypt, and flags them for rehash', async () => {
        await expect(
            service.passwordVerify('aaAA@123', BCRYPTJS_HASH)
        ).resolves.toBe(true);
        await expect(
            service.passwordVerify('wrong', BCRYPTJS_HASH)
        ).resolves.toBe(false);
        expect(service.passwordNeedsRehash(BCRYPTJS_HASH)).toBe(true);
    });
});

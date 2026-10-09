import { EntityManager } from '@mikro-orm/postgresql';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import { MigrationUserCreateSeed } from 'src/migration/seeds/migration.user-create.seed';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { CountryService } from 'src/modules/country/services/country.service';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';
import { RoleService } from 'src/modules/role/services/role.service';
import { UserService } from 'src/modules/user/services/user.service';
import { VerificationService } from 'src/modules/verification/services/verification.service';

const STRONG = 'Str0ngEnough';
const PASSWORD_HASH = { passwordHash: 'hashed' };
const ROLES: Record<string, { id: string }> = {
    superadmin: { id: 'role-superadmin' },
    admin: { id: 'role-admin' },
};

describe('MigrationUserCreateSeed', () => {
    let em: { flush: jest.Mock };
    let authService: { createPassword: jest.Mock };
    let userService: {
        existByEmail: jest.Mock;
        signUp: jest.Mock;
        updateVerificationEmail: jest.Mock;
    };
    let roleService: { findOneByName: jest.Mock };
    let countryService: { findOneByAlpha2: jest.Mock };
    let passwordHistoryService: { createByAdmin: jest.Mock };
    let activityService: { createByAdmin: jest.Mock };
    let verificationService: {
        createEmailByUser: jest.Mock;
        verify: jest.Mock;
    };
    let seed: MigrationUserCreateSeed;

    beforeEach(() => {
        em = { flush: jest.fn().mockResolvedValue(undefined) };
        authService = {
            createPassword: jest.fn().mockResolvedValue(PASSWORD_HASH),
        };
        userService = {
            existByEmail: jest.fn().mockResolvedValue(false),
            signUp: jest.fn(async (_role: string, { email, name }) => ({
                id: 'user-1',
                email,
                name,
            })),
            updateVerificationEmail: jest.fn().mockResolvedValue(undefined),
        };
        roleService = {
            findOneByName: jest.fn(async (name: string) => ROLES[name] ?? null),
        };
        countryService = {
            findOneByAlpha2: jest.fn(async (alpha2: string) =>
                alpha2 === 'VN' ? { id: 'country-vn' } : null
            ),
        };
        passwordHistoryService = {
            createByAdmin: jest.fn().mockResolvedValue(undefined),
        };
        activityService = {
            createByAdmin: jest.fn().mockResolvedValue(undefined),
        };
        verificationService = {
            createEmailByUser: jest.fn().mockResolvedValue({ id: 'ver-1' }),
            verify: jest.fn().mockResolvedValue(undefined),
        };

        seed = new MigrationUserCreateSeed(
            em as unknown as EntityManager,
            authService as unknown as AuthService,
            userService as unknown as UserService,
            roleService as unknown as RoleService,
            countryService as unknown as CountryService,
            passwordHistoryService as unknown as PasswordHistoryService,
            activityService as unknown as ActivityService,
            verificationService as unknown as VerificationService,
            new HelperStringService()
        );
    });

    it('creates a verified superadmin by default with the given password', async () => {
        const result = await seed.createUser({
            email: 'Owner@Example.com',
            password: STRONG,
        });

        expect(authService.createPassword).toHaveBeenCalledWith(STRONG);
        expect(userService.signUp).toHaveBeenCalledWith(
            'role-superadmin',
            {
                email: 'owner@example.com',
                name: 'owner',
                country: 'country-vn',
                password: STRONG,
            },
            PASSWORD_HASH
        );
        expect(verificationService.verify).toHaveBeenCalledWith({
            id: 'ver-1',
        });
        expect(userService.updateVerificationEmail).toHaveBeenCalled();
        expect(passwordHistoryService.createByAdmin).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'user-1' }),
            { by: 'user-1', type: ENUM_PASSWORD_HISTORY_TYPE.SIGN_UP }
        );
        expect(em.flush).toHaveBeenCalled();
        // A password the operator typed is never echoed back.
        expect(result.generatedPassword).toBeUndefined();
    });

    it('keeps names and emails out of the append-only audit entry', async () => {
        await seed.createUser({ email: 'owner@example.com', password: STRONG });

        const [, , activity] = activityService.createByAdmin.mock.calls[0];
        expect(activity.metadata).toEqual({ user: { id: 'user-1' } });
    });

    it('generates a strong password when none is given and returns it once', async () => {
        const result = await seed.createUser({ email: 'owner@example.com' });

        expect(result.generatedPassword).toBeDefined();
        expect(result.generatedPassword!.length).toBeGreaterThanOrEqual(20);
        expect(
            new HelperStringService().checkPasswordStrength(
                result.generatedPassword!
            )
        ).toBe(true);
        expect(authService.createPassword).toHaveBeenCalledWith(
            result.generatedPassword
        );
    });

    it('uses the requested role, name and country', async () => {
        countryService.findOneByAlpha2.mockResolvedValueOnce({
            id: 'country-sg',
        });

        await seed.createUser({
            email: 'ops@example.com',
            password: STRONG,
            role: 'admin',
            name: 'Ops Team',
            country: 'sg',
        });

        expect(countryService.findOneByAlpha2).toHaveBeenCalledWith('SG');
        expect(userService.signUp).toHaveBeenCalledWith(
            'role-admin',
            expect.objectContaining({
                name: 'Ops Team',
                country: 'country-sg',
            }),
            PASSWORD_HASH
        );
    });

    it.each([
        [
            'an invalid email',
            { email: 'not-an-email', password: STRONG },
            /email/i,
        ],
        [
            'a weak password',
            { email: 'owner@example.com', password: 'weakpass' },
            /password/i,
        ],
        [
            'an unknown role',
            { email: 'owner@example.com', password: STRONG, role: 'nope' },
            /role "nope"/i,
        ],
        [
            'an unknown country',
            { email: 'owner@example.com', password: STRONG, country: 'XX' },
            /country "XX"/i,
        ],
    ])('refuses %s and creates nothing', async (_label, input, message) => {
        await expect(seed.createUser(input)).rejects.toThrow(message);
        expect(userService.signUp).not.toHaveBeenCalled();
        expect(em.flush).not.toHaveBeenCalled();
    });

    it('refuses an email that already has an account', async () => {
        userService.existByEmail.mockResolvedValueOnce(true);

        await expect(
            seed.createUser({ email: 'owner@example.com', password: STRONG })
        ).rejects.toThrow(/already exists/);
        expect(userService.signUp).not.toHaveBeenCalled();
    });
});

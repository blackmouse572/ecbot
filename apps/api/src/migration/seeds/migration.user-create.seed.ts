import { RequestContext } from '@mikro-orm/core';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { isEmail } from 'class-validator';
import { randomInt } from 'crypto';
import { Command, Option } from 'nestjs-command';
import { HelperStringService } from 'src/common/helper/services/helper.string.service';
import {
    IUserCreateInput,
    IUserCreateResult,
} from 'src/migration/interfaces/user-create.interface';
import { ENUM_ACTIVITY_ACTION } from 'src/modules/activity/enums/activity.enum';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { AuthService } from 'src/modules/auth/services/auth.service';
import { CountryService } from 'src/modules/country/services/country.service';
import { ENUM_PASSWORD_HISTORY_TYPE } from 'src/modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from 'src/modules/password-history/services/password-history.service';
import { ENUM_POLICY_SUBJECT } from 'src/modules/policy/enums/policy.enum';
import { RoleService } from 'src/modules/role/services/role.service';
import { UserService } from 'src/modules/user/services/user.service';
import { VerificationService } from 'src/modules/verification/services/verification.service';

const GENERATED_PASSWORD_LENGTH = 24;
const PASSWORD_ALPHABETS = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
];

/**
 * `user:create`: creates one real, email-verified account from the command
 * line, e.g. the first superadmin of a fresh database:
 *
 *     pnpm --filter api user:create --email you@example.com [--password ...]
 *
 * Unlike `seed:user` it inserts no demo data, so `cli.ts` lets it run with
 * APP_ENV=production.
 */
@Injectable()
export class MigrationUserCreateSeed {
    constructor(
        private readonly em: EntityManager,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly activityService: ActivityService,
        private readonly verificationService: VerificationService,
        private readonly helperStringService: HelperStringService
    ) {}

    async createUser({
        email,
        password,
        role = 'superadmin',
        name,
        country = 'VN',
    }: IUserCreateInput): Promise<IUserCreateResult> {
        const normalizedEmail = email?.trim().toLowerCase() ?? '';
        if (!isEmail(normalizedEmail)) {
            throw new Error(`"${email}" is not a valid email`);
        }
        if (
            password !== undefined &&
            !this.helperStringService.checkPasswordStrength(password)
        ) {
            throw new Error(
                'The password needs at least 8 characters with an uppercase letter, a lowercase letter and a digit'
            );
        }

        const roleEntity = await this.roleService.findOneByName(role);
        if (!roleEntity) {
            throw new Error(`Role "${role}" not found. Run seed:role first.`);
        }
        const countryCode = country.toUpperCase();
        const countryEntity =
            await this.countryService.findOneByAlpha2(countryCode);
        if (!countryEntity) {
            throw new Error(`Country "${countryCode}" not found.`);
        }
        if (await this.userService.existByEmail(normalizedEmail)) {
            throw new Error(
                `An account for ${normalizedEmail} already exists.`
            );
        }

        const generatedPassword =
            password === undefined ? this.generatePassword() : undefined;
        const plainPassword = password ?? generatedPassword!;
        const passwordHash =
            await this.authService.createPassword(plainPassword);

        // The public sign-up path: no gender, and it drops the plain password
        // before persisting. It records signUpFrom as PUBLIC.
        const user = await this.userService.signUp(
            roleEntity.id,
            {
                email: normalizedEmail,
                name: name?.trim() || normalizedEmail.split('@')[0],
                country: countryEntity.id,
                password: plainPassword,
            },
            passwordHash
        );

        // Same follow-up as a sign-up, minus the email round trip: the
        // operator vouches for the address.
        const verification =
            await this.verificationService.createEmailByUser(user);
        await this.verificationService.verify(verification);
        await this.userService.updateVerificationEmail(user);
        await this.passwordHistoryService.createByAdmin(user, {
            by: user.id,
            type: ENUM_PASSWORD_HISTORY_TYPE.SIGN_UP,
        });
        // The audit log is append-only, so it keeps ids, not names or emails.
        await this.activityService.createByAdmin(user, user.id, {
            action: ENUM_ACTIVITY_ACTION.CREATE,
            subject: ENUM_POLICY_SUBJECT.USER,
            metadata: { user: { id: user.id } },
        });

        await this.em.flush();

        return {
            id: user.id,
            email: normalizedEmail,
            role,
            generatedPassword,
        };
    }

    @Command({
        command: 'user:create',
        describe: 'create one email-verified user (default role: superadmin)',
    })
    async create(
        @Option({ name: 'email', type: 'string', demandOption: true })
        email: string,
        @Option({
            name: 'password',
            type: 'string',
            describe: 'omit to generate one, printed once',
        })
        password: string | undefined,
        @Option({ name: 'role', type: 'string', default: 'superadmin' })
        role: string,
        @Option({
            name: 'name',
            type: 'string',
            describe: 'defaults to the part of the email before @',
        })
        name: string | undefined,
        @Option({
            name: 'country',
            type: 'string',
            default: 'VN',
            describe: 'ISO alpha-2 code',
        })
        country: string
    ): Promise<void> {
        // A request context makes this.em and the injected services resolve
        // to a fork (allowGlobalContext=false). Opened here rather than with
        // @CreateRequestContext, which replaces the method and drops the
        // @Option metadata nestjs-command reads.
        const result = await RequestContext.create(this.em, () =>
            this.createUser({ email, password, role, name, country })
        );

        // Written to stdout, not the Nest logger: `cli.ts` restricts the
        // application logger to error/fatal.
        process.stdout.write(
            `Created ${result.role} ${result.email} (id ${result.id}).\n`
        );
        if (result.generatedPassword) {
            process.stdout.write(
                `Generated password (shown once, change it after signing in): ${result.generatedPassword}\n`
            );
        }
    }

    /** At least one of each class, so it always passes checkPasswordStrength. */
    private generatePassword(): string {
        const all = PASSWORD_ALPHABETS.join('');
        const chars = PASSWORD_ALPHABETS.map(set => set[randomInt(set.length)]);
        while (chars.length < GENERATED_PASSWORD_LENGTH) {
            chars.push(all[randomInt(all.length)]);
        }
        for (let i = chars.length - 1; i > 0; i--) {
            const j = randomInt(i + 1);
            [chars[i], chars[j]] = [chars[j], chars[i]];
        }

        return chars.join('');
    }
}

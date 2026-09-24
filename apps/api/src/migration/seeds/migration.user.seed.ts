import { MessageService } from '@app/common/message/services/message.service';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { CountryEntity } from '@app/modules/country/repository/entities/country.entity';
import { CountryService } from '@app/modules/country/services/country.service';
import { ENUM_PASSWORD_HISTORY_TYPE } from '@app/modules/password-history/enums/password-history.enum';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { RoleEntity } from '@app/modules/role/repository/entities/role.entity';
import { RoleService } from '@app/modules/role/services/role.service';
import { SessionService } from '@app/modules/session/services/session.service';
import {
    ENUM_USER_GENDER,
    ENUM_USER_SIGN_UP_FROM,
} from '@app/modules/user/enums/user.enum';
import { UserService } from '@app/modules/user/services/user.service';
import { VerificationService } from '@app/modules/verification/services/verification.service';
import { EntityManager } from '@mikro-orm/postgresql';
import { CreateRequestContext } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';

@Injectable()
export class MigrationUserSeed {
    constructor(
        private readonly em: EntityManager,
        private readonly authService: AuthService,
        private readonly userService: UserService,
        private readonly roleService: RoleService,
        private readonly countryService: CountryService,
        private readonly passwordHistoryService: PasswordHistoryService,
        private readonly activityService: ActivityService,
        private readonly sessionService: SessionService,
        private readonly verificationService: VerificationService
    ) {}

    @Command({
        command: 'seed:user',
        describe: 'seed users',
    })
    // Establish a request context so this.em and the injected services resolve to
    // a fork (allowGlobalContext=false); mirrors ContextualWorkerHost's seam.
    @CreateRequestContext<MigrationUserSeed>(seed => seed.em)
    async seeds(): Promise<void> {
        const password = 'aaAA@123';
        const passwordHash = await this.authService.createPassword(password);
        const superAdminRole: RoleEntity =
            await this.roleService.findOneByName('superadmin');
        const adminRole: RoleEntity =
            await this.roleService.findOneByName('admin');

        const country: CountryEntity =
            await this.countryService.findOneByAlpha2('ID');

        const individualRole: RoleEntity =
            await this.roleService.findOneByName('individual');
        const premiumRole: RoleEntity =
            await this.roleService.findOneByName('premium');
        const businessRole: RoleEntity =
            await this.roleService.findOneByName('business');

        try {
            if (
                !superAdminRole ||
                !adminRole ||
                !businessRole ||
                !individualRole ||
                !premiumRole
            ) {
                throw new Error('Role not found, please seed role first', {
                    cause: `role: ${!superAdminRole ? 'superadmin' : ''} ${!adminRole ? 'admin' : ''} ${!businessRole ? 'business' : ''} ${!individualRole ? 'individual' : ''} ${!premiumRole ? 'premium' : ''}`,
                });
            }
            if (!country) {
                throw new Error(
                    'Country not found, please seed country first',
                    {
                        cause: `country: ID`,
                    }
                );
            }
            const users = await Promise.all([
                this.userService.create(
                    {
                        role: superAdminRole.id,
                        name: 'superadmin',
                        email: 'superadmin@mail.com',
                        country: country.id,
                        gender: ENUM_USER_GENDER.MALE,
                    },
                    passwordHash,
                    ENUM_USER_SIGN_UP_FROM.SEED
                ),
                this.userService.create(
                    {
                        role: adminRole.id,
                        name: 'admin',
                        email: 'admin@mail.com',
                        country: country.id,
                        gender: ENUM_USER_GENDER.MALE,
                    },
                    passwordHash,
                    ENUM_USER_SIGN_UP_FROM.SEED
                ),
                this.userService.create(
                    {
                        role: individualRole.id,
                        name: 'individual',
                        email: 'individual@mail.com',
                        country: country.id,
                        gender: ENUM_USER_GENDER.MALE,
                    },
                    passwordHash,
                    ENUM_USER_SIGN_UP_FROM.SEED
                ),
                this.userService.create(
                    {
                        role: premiumRole.id,
                        name: 'premium',
                        email: 'premium@mail.com',
                        country: country.id,
                        gender: ENUM_USER_GENDER.MALE,
                    },
                    passwordHash,
                    ENUM_USER_SIGN_UP_FROM.SEED
                ),
                this.userService.create(
                    {
                        role: businessRole.id,
                        name: 'business',
                        email: 'business@mail.com',
                        country: country.id,
                        gender: ENUM_USER_GENDER.MALE,
                    },
                    passwordHash,
                    ENUM_USER_SIGN_UP_FROM.SEED
                ),
            ]);

            for (const user of users) {
                const verification =
                    await this.verificationService.createEmailByUser(user);

                const promises = [
                    this.userService.updateVerificationEmail(user),
                    this.activityService.createByAdmin(user, user.id, {
                        action: ENUM_ACTIVITY_ACTION.CREATE,
                        subject: ENUM_POLICY_SUBJECT.USER,
                        metadata: {
                            user: {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                            },
                        },
                    }),
                    this.passwordHistoryService.createByAdmin(user, {
                        by: user.id,
                        type: ENUM_PASSWORD_HISTORY_TYPE.SIGN_UP,
                    }),
                    this.verificationService.verify(verification),
                ];

                await Promise.all(promises);
            }
        } catch (error) {
            // ignore
            console.error(error.cause);
            throw new Error(error);
        }

        await this.em.flush();
    }

    async remove(): Promise<void> {
        try {
            await this.activityService.deleteMany();
            await this.passwordHistoryService.deleteMany();
            await this.sessionService.resetLoginSession();
            await this.sessionService.deleteMany();
            await this.userService.deleteMany();
            await this.verificationService.deleteMany();
        } catch (err: any) {
            throw new Error(err);
        }

        return;
    }
}

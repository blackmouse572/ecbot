import { NotificationModule } from '@app/modules/notification/notification.module';
import { VerificationModule } from '@app/modules/verification/verification.module';
import { Module } from '@nestjs/common';
import { CommandModule } from 'nestjs-command';
import { CommonModule } from 'src/common/common.module';
import { MigrationAccountTokenReencryptSeed } from 'src/migration/seeds/migration.account-token-reencrypt.seed';
import { MigrationApiKeySeed } from 'src/migration/seeds/migration.api-key.seed';
import { MigrationCountrySeed } from 'src/migration/seeds/migration.country.seed';
import { MigrationPlanSeed } from 'src/migration/seeds/migration.plan.seed';
import { MigrationRoleSeed } from 'src/migration/seeds/migration.role.seed';
import { MigrationSkillSeed } from 'src/migration/seeds/migration.skill.seed';
import { MigrationSkillSmoke } from 'src/migration/seeds/migration.skill.smoke';
import { MigrationTemplateSeed } from 'src/migration/seeds/migration.template.seed';
import { AccountRepositoryModule } from 'src/modules/account/repository/account.repository.module';
import { ActivityModule } from 'src/modules/activity/activity.module';
import { AwsModule } from 'src/modules/aws/aws.module';
import { BillingRepositoryModule } from 'src/modules/billing/repository/billing.repository.module';
import { SkillModule } from 'src/modules/skill/skill.module';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { CountryModule } from 'src/modules/country/country.module';
import { EmailModule } from 'src/modules/email/email.module';
import { PasswordHistoryModule } from 'src/modules/password-history/password-history.module';
import { RoleModule } from 'src/modules/role/role.module';
import { SessionModule } from 'src/modules/session/session.module';
import { UserModule } from 'src/modules/user/user.module';
import { MigrationUserSeed } from './seeds/migration.user.seed';

// TODO: (v8) CHANGE WITH COMMANDER
@Module({
    imports: [
        CommonModule,
        CommandModule,
        AccountRepositoryModule,
        ApiKeyModule,
        CountryModule,
        EmailModule.register(),
        AuthModule,
        RoleModule,
        UserModule,
        ActivityModule,
        PasswordHistoryModule,
        SessionModule,
        CountryModule,
        VerificationModule,
        NotificationModule,
        AwsModule,
        SkillModule,
        BillingRepositoryModule,
    ],
    providers: [
        MigrationAccountTokenReencryptSeed,
        MigrationApiKeySeed,
        MigrationCountrySeed,
        MigrationUserSeed,
        MigrationRoleSeed,
        MigrationPlanSeed,
        MigrationTemplateSeed,
        MigrationSkillSeed,
        MigrationSkillSmoke,
    ],
    exports: [],
})
export class MigrationModule {}

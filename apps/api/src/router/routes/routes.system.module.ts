import { FacebookActivityController } from '@app/common/facebook-activity/controllers/facebook-activity.controller';
import { FacebookActivityModule } from '@app/common/facebook-activity/facebook-activity.module';
import { FacebookModule } from '@app/common/facebook/facebook.module';
import { AuthModule } from '@app/modules/auth/auth.module';
import { ConversationModule } from '@app/modules/conversation/conversation.module';
import { CustomerModule } from '@app/modules/customer/customer.module';
import { Module } from '@nestjs/common';
import { ApiKeyModule } from 'src/modules/api-key/api-key.module';
import { CountrySystemController } from 'src/modules/country/controllers/country.system.controller';
import { CountryModule } from 'src/modules/country/country.module';
import { CustomerSystemController } from 'src/modules/customer/controllers/customer.system.controller';
import { CustomerTagSystemController } from 'src/modules/customer/controllers/customer-tag.system.controller';
import { HealthSystemController } from 'src/modules/health/controllers/health.system.controller';
import { HealthModule } from 'src/modules/health/health.module';
import { FollowupSystemController } from 'src/modules/platform/controllers/followup.system.controller';
import { PocSystemController } from 'src/modules/platform/controllers/poc.system.controller';
import { PlatformModule } from 'src/modules/platform/platform.module';
import { RoleSystemController } from 'src/modules/role/controllers/role.system.controller';
import { RoleModule } from 'src/modules/role/role.module';
import { SettingSystemController } from 'src/modules/setting/controllers/setting.system.controller';
import { SettingModule } from 'src/modules/setting/setting.module';
import { ToolSystemController } from 'src/modules/tool/controllers/tool.system.controller';
import { ToolModule } from 'src/modules/tool/tool.module';
import { UserSystemController } from 'src/modules/user/controllers/user.system.controller';
import { UserModule } from 'src/modules/user/user.module';

@Module({
    controllers: [
        HealthSystemController,
        SettingSystemController,
        CountrySystemController,
        RoleSystemController,
        UserSystemController,
        ToolSystemController,
        FacebookActivityController,
        CustomerSystemController,
        CustomerTagSystemController,
        FollowupSystemController,
        PocSystemController,
    ],
    providers: [],
    exports: [],
    imports: [
        HealthModule,
        SettingModule,
        CountryModule,
        UserModule,
        RoleModule,
        ToolModule,
        HealthModule,
        ApiKeyModule,
        FacebookModule,
        FacebookActivityModule,
        AuthModule,
        CustomerModule,
        ConversationModule,
        PlatformModule,
    ],
})
export class RoutesSystemModule {}

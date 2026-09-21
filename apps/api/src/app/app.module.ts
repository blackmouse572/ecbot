import { Module } from '@nestjs/common';
import { RouterModule } from 'src/router/router.module';
import { CommonModule } from 'src/common/common.module';
import { AppMiddlewareModule } from 'src/app/app.middleware.module';
import {
    TestHelpersModule,
    shouldLoadTestHelpers,
} from 'src/modules/test-helpers/test-helpers.module';
import { loadEnterpriseModules } from 'src/app/enterprise.loader';
import { MeteringStatusLogger } from 'src/app/metering-status.logger';

@Module({
    controllers: [],
    providers: [MeteringStatusLogger],
    imports: [
        // Common
        CommonModule,
        AppMiddlewareModule,

        // Routes
        RouterModule,

        // Test helpers (E2E only)
        ...(shouldLoadTestHelpers(process.env) ? [TestHelpersModule] : []),

        // Enterprise overlay (absent in the public/OSS build)
        ...loadEnterpriseModules(),
    ],
})
export class AppModule {}

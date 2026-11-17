import { Global, Module } from '@nestjs/common';
import { FeatureFlagInterceptor } from './interceptors/feature-flag.interceptor';
import { FeatureFlagService } from './services/feature-flag.service';

/** Global: any module gates on a flag without importing this one. */
@Global()
@Module({
    providers: [FeatureFlagService, FeatureFlagInterceptor],
    exports: [FeatureFlagService, FeatureFlagInterceptor],
})
export class FeatureFlagModule {}

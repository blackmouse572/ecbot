import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ENUM_FEATURE_FLAG } from '../enums/feature-flag.enum';
import {
    FEATURE_FLAG_PROVIDER,
    IFeatureFlagProvider,
    IFeatureFlags,
} from '../interfaces/feature-flag.interface';

@Injectable()
export class FeatureFlagService {
    private readonly logger = new Logger(FeatureFlagService.name);

    constructor(
        private readonly configService: ConfigService,
        @Optional()
        @Inject(FEATURE_FLAG_PROVIDER)
        private readonly provider?: IFeatureFlagProvider
    ) {}

    /** A failed lookup reads as off: a flag hides a feature until it says otherwise. */
    async isEnabled(
        flag: ENUM_FEATURE_FLAG,
        workspaceId: string
    ): Promise<boolean> {
        if (!this.provider) {
            return (
                this.configService.get<boolean>(`featureFlag.${flag}`) ?? false
            );
        }
        try {
            return await this.provider.isEnabled(flag, workspaceId);
        } catch (error: unknown) {
            this.logger.warn(
                `Feature flag ${flag} lookup failed for workspace ${workspaceId}: ${String(error)}`
            );
            return false;
        }
    }

    async forWorkspace(workspaceId: string): Promise<IFeatureFlags> {
        const [orders, customerSources] = await Promise.all([
            this.isEnabled(ENUM_FEATURE_FLAG.ORDERS, workspaceId),
            this.isEnabled(ENUM_FEATURE_FLAG.CUSTOMER_SOURCES, workspaceId),
        ]);
        return { orders, customerSources };
    }
}

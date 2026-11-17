import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    FEATURE_FLAG_FRESH_MS,
    FEATURE_FLAG_MAX_CACHED,
    FEATURE_FLAG_STALE_MS,
} from '../constants/feature-flag.constant';
import { ENUM_FEATURE_FLAG } from '../enums/feature-flag.enum';
import {
    FEATURE_FLAG_PROVIDER,
    IFeatureFlagProvider,
    IFeatureFlags,
} from '../interfaces/feature-flag.interface';

@Injectable()
export class FeatureFlagService {
    private readonly logger = new Logger(FeatureFlagService.name);
    private readonly answers = new Map<string, { at: number; on: boolean }>();

    constructor(
        private readonly configService: ConfigService,
        @Optional()
        @Inject(FEATURE_FLAG_PROVIDER)
        private readonly provider?: IFeatureFlagProvider
    ) {}

    /**
     * A provider answer is reused for a minute, and kept through an outage
     * for ten. With no answer to fall back on, a failed lookup reads as off:
     * a flag hides a feature until it says otherwise.
     */
    async isEnabled(
        flag: ENUM_FEATURE_FLAG,
        workspaceId: string
    ): Promise<boolean> {
        if (!this.provider) {
            return (
                this.configService.get<boolean>(`featureFlag.${flag}`) ?? false
            );
        }
        const key = `${flag}:${workspaceId}`;
        const cached = this.answers.get(key);
        const age = cached ? Date.now() - cached.at : Infinity;
        if (cached && age < FEATURE_FLAG_FRESH_MS) return cached.on;
        try {
            const on = await this.provider.isEnabled(flag, workspaceId);
            if (this.answers.size >= FEATURE_FLAG_MAX_CACHED)
                this.answers.clear();
            this.answers.set(key, { at: Date.now(), on });
            return on;
        } catch (error: unknown) {
            this.logger.warn(
                `Feature flag ${flag} lookup failed for workspace ${workspaceId}: ${String(error)}`
            );
            return cached && age < FEATURE_FLAG_STALE_MS ? cached.on : false;
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

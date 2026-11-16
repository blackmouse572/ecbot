import { ENUM_FEATURE_FLAG } from '../enums/feature-flag.enum';

export const FEATURE_FLAG_PROVIDER = Symbol('FEATURE_FLAG_PROVIDER');

/**
 * Feature flag seam. Absent in the public build: flags come from the
 * FEATURE_*_ENABLE env vars. Ecbot Cloud provides it to read them from its
 * flag service.
 */
export interface IFeatureFlagProvider {
    isEnabled(flag: ENUM_FEATURE_FLAG, workspaceId: string): Promise<boolean>;
}

/** Every flag for one workspace, as the app and apps/ai read them. */
export interface IFeatureFlags {
    orders: boolean;
    customerSources: boolean;
}

import { registerAs } from '@nestjs/config';
import { ENUM_FEATURE_FLAG } from 'src/modules/feature-flag/enums/feature-flag.enum';

// process.env values are always strings: only the literal 'true' turns one on.
const isFlagOn = (value?: string): boolean => value === 'true';

/**
 * Feature flags when no FEATURE_FLAG_PROVIDER is bound (open edition, local
 * dev). Off unless the env var is 'true'. With a provider, these are ignored.
 */
export default registerAs(
    'featureFlag',
    (): Record<ENUM_FEATURE_FLAG, boolean> => ({
        [ENUM_FEATURE_FLAG.ORDERS]: isFlagOn(process.env.FEATURE_ORDERS_ENABLE),
        [ENUM_FEATURE_FLAG.CUSTOMER_SOURCES]: isFlagOn(
            process.env.FEATURE_CUSTOMER_SOURCES_ENABLE
        ),
        [ENUM_FEATURE_FLAG.MARKETING]: isFlagOn(
            process.env.FEATURE_MARKETING_ENABLE
        ),
    })
);

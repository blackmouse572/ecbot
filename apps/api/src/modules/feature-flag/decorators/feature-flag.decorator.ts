import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common';
import { FEATURE_FLAG_META_KEY } from '../constants/feature-flag.constant';
import { ENUM_FEATURE_FLAG } from '../enums/feature-flag.enum';
import { FeatureFlagInterceptor } from '../interceptors/feature-flag.interceptor';

/** On a workspace controller or route: 404 while `flag` is off for the workspace. */
export function FeatureFlagProtected(
    flag: ENUM_FEATURE_FLAG
): ClassDecorator & MethodDecorator {
    return applyDecorators(
        SetMetadata(FEATURE_FLAG_META_KEY, flag),
        UseInterceptors(FeatureFlagInterceptor)
    );
}

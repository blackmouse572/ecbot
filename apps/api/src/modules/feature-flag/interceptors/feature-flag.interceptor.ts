import { IRequestApp } from '@app/common/request/interfaces/request.interface';
import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { FEATURE_FLAG_META_KEY } from '../constants/feature-flag.constant';
import { ENUM_FEATURE_FLAG } from '../enums/feature-flag.enum';
import { FeatureFlagService } from '../services/feature-flag.service';

/**
 * 404s a route while its feature flag is off. An interceptor, not a guard:
 * it runs after the route's workspace guards, which resolve the workspace.
 */
@Injectable()
export class FeatureFlagInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly featureFlagService: FeatureFlagService
    ) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Promise<Observable<unknown>> {
        const flag = this.reflector.getAllAndOverride<ENUM_FEATURE_FLAG>(
            FEATURE_FLAG_META_KEY,
            [context.getHandler(), context.getClass()]
        );
        const { __workspace } = context
            .switchToHttp()
            .getRequest<IRequestApp>();
        if (
            flag &&
            !(
                __workspace &&
                (await this.featureFlagService.isEnabled(flag, __workspace.id))
            )
        ) {
            throw new NotFoundException({
                statusCode: 404,
                message: 'featureFlag.error.off',
            });
        }
        return next.handle();
    }
}

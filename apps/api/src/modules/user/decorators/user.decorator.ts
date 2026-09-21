import { USER_GUARD_EMAIL_VERIFIED_META_KEY } from '@app/modules/user/constants/user.constant';
import {
    applyDecorators,
    createParamDecorator,
    ExecutionContext,
    SetMetadata,
    UseGuards,
} from '@nestjs/common';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { UserGuard } from 'src/modules/user/guards/user.guard';

// createParamDecorator bypasses the global ValidationPipe's metatype transformation,
// which would otherwise reject UserEntity (no class-validator decorators) via forbidUnknownValues.
export const UserParam = createParamDecorator(
    (paramName: string, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest<IRequestApp>();
        return request.params[paramName];
    }
);

export function UserProtected(
    emailVerified: boolean[] = [true]
): MethodDecorator {
    return applyDecorators(
        UseGuards(UserGuard),
        SetMetadata(USER_GUARD_EMAIL_VERIFIED_META_KEY, emailVerified)
    );
}

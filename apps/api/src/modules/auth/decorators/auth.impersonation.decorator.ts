import { SetMetadata } from '@nestjs/common';
import { AUTH_ALLOW_IMPERSONATION_META_KEY } from 'src/modules/auth/constants/auth.impersonation.constant';

/**
 * Opt a non-read handler in to being called with an impersonation token.
 * Impersonation ("user view mode") is read-only by default; the only things it
 * may write are managing its own session (end / renew).
 */
export const AllowImpersonation = (): MethodDecorator =>
    SetMetadata(AUTH_ALLOW_IMPERSONATION_META_KEY, true);

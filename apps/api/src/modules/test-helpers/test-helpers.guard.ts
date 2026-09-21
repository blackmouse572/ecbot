import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';

@Injectable()
export class TestHelpersGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<IRequestApp>();
        const key = req.headers['x-test-key'];
        const expected = process.env.E2E_TEST_KEY;

        if (!expected || typeof key !== 'string') {
            throw new ForbiddenException('Invalid test key');
        }

        const keyBuffer = Buffer.from(key);
        const expectedBuffer = Buffer.from(expected);

        // timingSafeEqual throws on length mismatch; check length first so a
        // mismatch is simply invalid rather than an unhandled TypeError.
        if (
            keyBuffer.length !== expectedBuffer.length ||
            !timingSafeEqual(keyBuffer, expectedBuffer)
        ) {
            throw new ForbiddenException('Invalid test key');
        }

        return true;
    }
}

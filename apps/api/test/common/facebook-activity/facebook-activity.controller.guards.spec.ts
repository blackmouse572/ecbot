// The global setup stubs UserProtected; the guard it adds is the one that
// read request.user before the JWT guard had set it.
jest.unmock('@app/modules/user/decorators/user.decorator');

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { FacebookActivityController } from '@app/common/facebook-activity/controllers/facebook-activity.controller';
import { ApiKeySystemProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import { AuthJwtAccessProtected } from '@app/modules/auth/decorators/auth.jwt.decorator';
import { PolicyRoleProtected } from '@app/modules/policy/decorators/policy.decorator';
import { ENUM_POLICY_ROLE_TYPE } from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';

// The route convention, stacked the way every other admin route is: Nest
// applies decorators bottom-up, so the API key and JWT guards run before
// UserGuard reads request.user.
class Reference {
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeySystemProtected()
    handler(): void {}
}

const guardsOf = (fn: object) => Reflect.getMetadata(GUARDS_METADATA, fn);

describe('FacebookActivityController guards', () => {
    it.each(['list', 'listByPageId', 'listBySenderId'] as const)(
        '%s runs its guards in the convention order',
        method => {
            expect(
                guardsOf(FacebookActivityController.prototype[method])
            ).toEqual(guardsOf(Reference.prototype.handler));
        }
    );
});

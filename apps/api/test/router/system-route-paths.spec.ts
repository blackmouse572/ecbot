import { PATH_METADATA } from '@nestjs/common/constants';
import { CustomerSystemController } from '../../src/modules/customer/controllers/customer.system.controller';
import { CustomerTagSystemController } from '../../src/modules/customer/controllers/customer-tag.system.controller';
import { FollowupSystemController } from '../../src/modules/platform/controllers/followup.system.controller';
import { PocSystemController } from '../../src/modules/platform/controllers/poc.system.controller';

// RoutesSystemModule is mounted under `/system` (router.module.ts), so a
// system controller's own path must not start with `/system` again. The
// doubled prefix served these at /api/v1/system/system/..., which apps/ai
// never called.
describe('system controller paths', () => {
    it.each([
        [CustomerSystemController, '/customers/:customerId'],
        [CustomerTagSystemController, '/customers/:customerId/tags'],
        [FollowupSystemController, '/followups'],
        [PocSystemController, '/poc'],
    ])('%p is mounted at %s under the /system router', (controller, path) => {
        expect(Reflect.getMetadata(PATH_METADATA, controller)).toBe(path);
    });
});

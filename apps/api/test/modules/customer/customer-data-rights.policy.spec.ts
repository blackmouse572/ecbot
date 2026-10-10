// The global setup stubs the workspace decorators to no-ops; record the
// abilities each route asks for instead.
jest.mock('@app/modules/workspace/decorators/workspace.decorator', () => ({
    WorkspaceScopedProtected: (...handlers: unknown[]) =>
        jest
            .requireActual('@nestjs/common')
            .SetMetadata('test:workspace-abilities', handlers),
    WorkspacePayload: () => () => undefined,
}));
const ABILITIES = 'test:workspace-abilities';

import { CustomerWorkspaceController } from '@app/modules/customer/controllers/customer.workspace.controller';
import { ExportWorkspaceController } from '@app/modules/export/controllers/export.workspace.controller';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';

// Member roles hold `manage CUSTOMER`, and CASL's `manage` matches every
// action. Erasure and export ask for CUSTOMER_DATA, which only the owner and
// admin roles hold.
describe('customer data rights routes', () => {
    it('erase requires DELETE on CUSTOMER_DATA', () => {
        expect(
            Reflect.getMetadata(
                ABILITIES,
                CustomerWorkspaceController.prototype.erase
            )
        ).toEqual([
            {
                subject: ENUM_POLICY_SUBJECT.CUSTOMER_DATA,
                action: [ENUM_POLICY_ACTION.DELETE],
            },
        ]);
    });

    it('export requires READ on CUSTOMER_DATA', () => {
        expect(
            Reflect.getMetadata(
                ABILITIES,
                ExportWorkspaceController.prototype.customer
            )
        ).toEqual([
            {
                subject: ENUM_POLICY_SUBJECT.CUSTOMER_DATA,
                action: [ENUM_POLICY_ACTION.READ],
            },
        ]);
    });

    it('export is rate limited', () => {
        const handler = ExportWorkspaceController.prototype.customer;
        expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(5);
        expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(
            60000
        );
    });
});

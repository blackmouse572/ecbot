import {
    ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT,
    ALLOWED_WORKSPACE_POLICY_SUBJECT,
} from '../../../../src/modules/role/constants/role.list.constant';
import { WORKSPACE_DEFAULT_MEMBER_ROLES } from '../../../../src/modules/workspace/constants/workspace.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '../../../../src/modules/policy/factories/policy.factory';

describe('workspace customer permissions', () => {
    it('includes CUSTOMER in the owner and Manager catalogs', () => {
        expect(ALLOWED_WORKSPACE_POLICY_SUBJECT).toContain(
            ENUM_POLICY_SUBJECT.CUSTOMER
        );
        expect(ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT).toContain(
            ENUM_POLICY_SUBJECT.CUSTOMER
        );
    });
});

// Export and permanent erasure of a customer's data are owner/admin only. In
// CASL `manage` matches every action, so they need their own subject: the
// Member role's `manage CUSTOMER` must not reach them.
describe('customer data rights permissions', () => {
    const factory = new PolicyAbilityFactory();
    const abilityOf = (name: string) =>
        factory.createForUser(
            WORKSPACE_DEFAULT_MEMBER_ROLES.find(r => r.name === name)!
                .permissions as any
        );

    it('refuses export and erase to the default Sales role', () => {
        const member = abilityOf('Sales');

        expect(
            member.can(ENUM_POLICY_ACTION.DELETE, ENUM_POLICY_SUBJECT.CUSTOMER)
        ).toBe(true);
        expect(
            member.can(
                ENUM_POLICY_ACTION.DELETE,
                ENUM_POLICY_SUBJECT.CUSTOMER_DATA
            )
        ).toBe(false);
        expect(
            member.can(
                ENUM_POLICY_ACTION.READ,
                ENUM_POLICY_SUBJECT.CUSTOMER_DATA
            )
        ).toBe(false);
    });

    it('allows export and erase to the default Manager role', () => {
        const admin = abilityOf('Manager');

        expect(
            admin.can(
                ENUM_POLICY_ACTION.DELETE,
                ENUM_POLICY_SUBJECT.CUSTOMER_DATA
            )
        ).toBe(true);
        expect(
            admin.can(
                ENUM_POLICY_ACTION.READ,
                ENUM_POLICY_SUBJECT.CUSTOMER_DATA
            )
        ).toBe(true);
    });

    it('is in the owner catalog, so new owner roles hold it', () => {
        expect(ALLOWED_WORKSPACE_POLICY_SUBJECT).toContain(
            ENUM_POLICY_SUBJECT.CUSTOMER_DATA
        );
    });
});

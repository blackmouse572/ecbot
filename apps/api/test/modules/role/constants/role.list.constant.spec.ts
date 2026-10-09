import {
    ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT,
    ALLOWED_MEMBER_WORKSPACE_POLICY_SUBJECT,
    ALLOWED_WORKSPACE_POLICY_SUBJECT,
} from '../../../../src/modules/role/constants/role.list.constant';
import { WORKSPACE_DEFAULT_MEMBER_ROLES } from '../../../../src/modules/workspace/constants/workspace.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '../../../../src/modules/policy/factories/policy.factory';

describe('workspace customer permissions', () => {
    it('includes CUSTOMER in every default workspace role permission catalog', () => {
        expect(ALLOWED_WORKSPACE_POLICY_SUBJECT).toContain(
            ENUM_POLICY_SUBJECT.CUSTOMER
        );
        expect(ALLOWED_MEMBER_WORKSPACE_POLICY_SUBJECT).toContain(
            ENUM_POLICY_SUBJECT.CUSTOMER
        );
        expect(ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT).toContain(
            ENUM_POLICY_SUBJECT.CUSTOMER
        );
        for (const role of WORKSPACE_DEFAULT_MEMBER_ROLES) {
            expect(role.permissions).toEqual(
                expect.arrayContaining([
                    {
                        action: ['manage'],
                        subject: ENUM_POLICY_SUBJECT.CUSTOMER,
                    },
                ])
            );
        }
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

    it('refuses export and erase to the default Member role', () => {
        const member = abilityOf('Member');

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

    it('allows export and erase to the default Admin role', () => {
        const admin = abilityOf('Admin');

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
        expect(ALLOWED_MEMBER_WORKSPACE_POLICY_SUBJECT).not.toContain(
            ENUM_POLICY_SUBJECT.CUSTOMER_DATA
        );
    });
});

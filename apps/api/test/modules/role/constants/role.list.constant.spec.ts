import {
    ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT,
    ALLOWED_MEMBER_WORKSPACE_POLICY_SUBJECT,
    ALLOWED_WORKSPACE_POLICY_SUBJECT,
} from '../../../../src/modules/role/constants/role.list.constant';
import { WORKSPACE_DEFAULT_MEMBER_ROLES } from '../../../../src/modules/workspace/constants/workspace.constant';
import { ENUM_POLICY_SUBJECT } from '../../../../src/modules/policy/enums/policy.enum';

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

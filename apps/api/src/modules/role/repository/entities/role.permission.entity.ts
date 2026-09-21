import { Embeddable, Enum, Property } from '@mikro-orm/postgresql';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';

@Embeddable()
export class RolePermissionEntity {
    @Enum(() => ENUM_POLICY_SUBJECT)
    subject: ENUM_POLICY_SUBJECT;

    @Property({ type: 'json' })
    action: ENUM_POLICY_ACTION[];
}

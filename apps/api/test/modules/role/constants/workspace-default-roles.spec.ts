import {
    ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT,
    ALLOWED_WORKSPACE_POLICY_SUBJECT,
} from '../../../../src/modules/role/constants/role.list.constant';
import {
    WORKSPACE_DEFAULT_MEMBER_ROLE_NAME,
    WORKSPACE_DEFAULT_MEMBER_ROLES,
} from '../../../../src/modules/workspace/constants/workspace.constant';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '../../../../src/modules/policy/enums/policy.enum';
import { PolicyAbilityFactory } from '../../../../src/modules/policy/factories/policy.factory';

const { READ, MANAGE, UPDATE, CREATE } = ENUM_POLICY_ACTION;
const S = ENUM_POLICY_SUBJECT;

const factory = new PolicyAbilityFactory();
const abilityOf = (name: string) => {
    const role = WORKSPACE_DEFAULT_MEMBER_ROLES.find(r => r.name === name);
    if (!role) throw new Error(`no built-in role ${name}`);
    return factory.createForUser(role.permissions as any);
};

describe('built-in workspace roles', () => {
    it('seeds Manager, Sales, Marketing and Developer as workspace member roles', () => {
        expect(WORKSPACE_DEFAULT_MEMBER_ROLES.map(r => r.name)).toEqual([
            'Manager',
            'Sales',
            'Marketing',
            'Developer',
        ]);
        for (const role of WORKSPACE_DEFAULT_MEMBER_ROLES) {
            expect(role.type).toBe(ENUM_POLICY_ROLE_TYPE.WORKSPACE_MEMBER);
            expect(role.description).toBeTruthy();
        }
    });

    it('grants invites and join requests the Sales role by default', () => {
        expect(WORKSPACE_DEFAULT_MEMBER_ROLE_NAME).toBe('Sales');
    });

    it('offers conversations, orders and marketing as role areas', () => {
        for (const subject of [S.CONVERSATION, S.ORDER, S.MARKETING]) {
            expect(ALLOWED_WORKSPACE_POLICY_SUBJECT).toContain(subject);
            expect(ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT).toContain(subject);
        }
    });

    it('Manager manages everything a member role can hold', () => {
        const manager = abilityOf('Manager');
        for (const subject of ALLOWED_ADMIN_WORKSPACE_POLICY_SUBJECT) {
            expect(manager.can(MANAGE, subject)).toBe(true);
        }
    });

    it('Sales works conversations, customers and orders, and only views agents', () => {
        const sales = abilityOf('Sales');
        expect(sales.can(MANAGE, S.CONVERSATION)).toBe(true);
        expect(sales.can(MANAGE, S.CUSTOMER)).toBe(true);
        expect(sales.can(MANAGE, S.ORDER)).toBe(true);
        expect(sales.can(READ, S.CHATBOT)).toBe(true);
        expect(sales.can(UPDATE, S.CHATBOT)).toBe(false);
        expect(sales.can(READ, S.MARKETING)).toBe(false);
        expect(sales.can(READ, S.CUSTOMER_DATA)).toBe(false);
        expect(sales.can(READ, S.MEMBER)).toBe(false);
        expect(sales.can(READ, S.KNOWLEDGE_BASE)).toBe(false);
    });

    it('Marketing manages marketing and only views conversations, customers and orders', () => {
        const marketing = abilityOf('Marketing');
        expect(marketing.can(MANAGE, S.MARKETING)).toBe(true);
        for (const subject of [S.CONVERSATION, S.CUSTOMER, S.ORDER]) {
            expect(marketing.can(READ, subject)).toBe(true);
            expect(marketing.can(UPDATE, subject)).toBe(false);
        }
        expect(marketing.can(READ, S.CHATBOT)).toBe(false);
        expect(marketing.can(READ, S.CUSTOMER_DATA)).toBe(false);
        expect(marketing.can(READ, S.MEMBER)).toBe(false);
    });

    it('Developer builds agents and keys, and only views conversations and customers', () => {
        const developer = abilityOf('Developer');
        for (const subject of [
            S.CHATBOT,
            S.KNOWLEDGE_BASE,
            S.RAG,
            S.TOOL,
            S.SKILL,
            S.CLIENT_CREDENTIAL,
        ]) {
            expect(developer.can(MANAGE, subject)).toBe(true);
        }
        expect(developer.can(READ, S.TOKEN_USAGE)).toBe(true);
        expect(developer.can(READ, S.CONVERSATION)).toBe(true);
        expect(developer.can(CREATE, S.CONVERSATION)).toBe(false);
        expect(developer.can(READ, S.CUSTOMER)).toBe(true);
        expect(developer.can(UPDATE, S.CUSTOMER)).toBe(false);
        expect(developer.can(READ, S.ORDER)).toBe(false);
        expect(developer.can(READ, S.MARKETING)).toBe(false);
        expect(developer.can(READ, S.CUSTOMER_DATA)).toBe(false);
        expect(developer.can(READ, S.MEMBER)).toBe(false);
    });
});

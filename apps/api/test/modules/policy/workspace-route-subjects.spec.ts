import { WORKSPACE_POLICY_ABILITY_META_KEY } from '../../../src/modules/workspace/constants/workspace.constant';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import { ENUM_POLICY_SUBJECT } from '../../../src/modules/policy/enums/policy.enum';
import { IPolicyAbility } from '../../../src/modules/policy/interfaces/policy.interface';
import { ConversationWorkspaceController } from '../../../src/modules/conversation/controllers/conversation.workspace.controller';
import { ConversationClientController } from '../../../src/modules/conversation/controllers/conversation.client.controller';
import { FollowupWorkspaceController } from '../../../src/modules/platform/controllers/followup.workspace.controller';
import { OrderWorkspaceController } from '../../../src/modules/order/controllers/order.workspace.controller';
import { ProductGroupWorkspaceController } from '../../../src/modules/order/controllers/product-group.workspace.controller';
import { MarketingOverviewWorkspaceController } from '../../../src/modules/marketing/controllers/marketing-overview.workspace.controller';
import { MarketingAudienceWorkspaceController } from '../../../src/modules/marketing/controllers/marketing-audience.workspace.controller';
import { MarketingSettingsWorkspaceController } from '../../../src/modules/marketing/controllers/marketing-settings.workspace.controller';
import { MarketingSettingsClientController } from '../../../src/modules/marketing/controllers/marketing-settings.client.controller';
import { MarketingSavedAudienceClientController } from '../../../src/modules/marketing/controllers/marketing-saved-audience.client.controller';
import { CustomerMarketingBackfillWorkspaceController } from '../../../src/modules/customer/controllers/customer-marketing-backfill.workspace.controller';
import { AnalyticsWorkspaceController } from '../../../src/modules/analytics/controllers/analytics.workspace.controller';
import { TrackedLinkWorkspaceController } from '../../../src/modules/customer/controllers/tracked-link.workspace.controller';

// The global setup swaps these decorators for no-ops; record what each route
// asks for instead, under the key the real decorators use.
jest.mock('@app/modules/workspace/decorators/workspace.decorator', () => {
    const { SetMetadata } = jest.requireActual('@nestjs/common');
    const record = (...handlers: unknown[]) =>
        SetMetadata('WorkspacePolicyAbilityMetaKey', handlers);
    const noop = () => () => undefined;
    return {
        WorkspaceScopedProtected: record,
        WorkspacePolicyAbilityProtected: record,
        WorkspaceMemberOrOwnerProtected: noop,
        WorkspaceMemberProtected: noop,
        WorkspaceOwnerProtected: noop,
        WorkspacePayload: noop,
    };
});

type Ctor = { prototype: object; name: string };

// Every guarded handler of a controller, with the subjects it requires.
function handlerSubjects(controller: Ctor, metaKey: string) {
    const proto = controller.prototype as Record<string, unknown>;
    return Object.getOwnPropertyNames(proto)
        .filter(name => name !== 'constructor')
        .map(name => ({
            name,
            abilities: Reflect.getMetadata(metaKey, proto[name]) as
                IPolicyAbility[] | undefined,
        }))
        .filter(h => h.abilities?.length)
        .map(h => ({
            name: `${controller.name}.${h.name}`,
            subjects: h.abilities!.map(a => a.subject),
            actions: h.abilities!.flatMap(a => a.action),
        }));
}

const ws = (c: Ctor) => handlerSubjects(c, WORKSPACE_POLICY_ABILITY_META_KEY);
const client = (c: Ctor) =>
    handlerSubjects(c, CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY);

describe('workspace route subjects', () => {
    it.each([
        ['conversations', ws(ConversationWorkspaceController)],
        ['client conversations', client(ConversationClientController)],
        ['follow-ups', ws(FollowupWorkspaceController)],
    ])('%s need CONVERSATION', (_, handlers) => {
        expect(handlers.length).toBeGreaterThan(0);
        for (const h of handlers) {
            expect({ name: h.name, subjects: h.subjects }).toEqual({
                name: h.name,
                subjects: [ENUM_POLICY_SUBJECT.CONVERSATION],
            });
        }
    });

    it('orders need ORDER', () => {
        const handlers = ws(OrderWorkspaceController);
        expect(handlers.length).toBeGreaterThan(0);
        for (const h of handlers) {
            expect(h.subjects).toEqual([ENUM_POLICY_SUBJECT.ORDER]);
        }
    });

    it.each([
        ['marketing overview', ws(MarketingOverviewWorkspaceController)],
        ['audiences', ws(MarketingAudienceWorkspaceController)],
        [
            'client saved audiences',
            client(MarketingSavedAudienceClientController),
        ],
        ['send settings', ws(MarketingSettingsWorkspaceController)],
        ['client send settings', client(MarketingSettingsClientController)],
        [
            'classifier backfill',
            ws(CustomerMarketingBackfillWorkspaceController),
        ],
    ])('%s need MARKETING', (_, handlers) => {
        expect(handlers.length).toBeGreaterThan(0);
        for (const h of handlers) {
            expect(h.subjects).toEqual([ENUM_POLICY_SUBJECT.MARKETING]);
        }
    });

    // Sales picks or adds product groups on orders and filters customers by
    // source, so those stay open to them; changing either is marketing work.
    it.each([
        [
            'product groups',
            ws(ProductGroupWorkspaceController),
            ENUM_POLICY_SUBJECT.ORDER,
            ['read', 'create'],
        ],
        [
            'customer sources',
            ws(TrackedLinkWorkspaceController),
            ENUM_POLICY_SUBJECT.CUSTOMER,
            ['read'],
        ],
    ])(
        '%s use %s for %j, MARKETING for the rest',
        (_, handlers, openSubject, openActions) => {
            expect(handlers.length).toBeGreaterThan(0);
            for (const h of handlers) {
                const open = h.actions.every(a => openActions.includes(a));
                expect({ name: h.name, subjects: h.subjects }).toEqual({
                    name: h.name,
                    subjects: [
                        open ? openSubject : ENUM_POLICY_SUBJECT.MARKETING,
                    ],
                });
            }
        }
    );

    // The Marketing role views conversations but not agents.
    it('marketing analytics needs CUSTOMER and CONVERSATION read', () => {
        const marketing = ws(AnalyticsWorkspaceController).find(h =>
            h.name.endsWith('.marketing')
        );
        expect(marketing?.subjects).toEqual([
            ENUM_POLICY_SUBJECT.CUSTOMER,
            ENUM_POLICY_SUBJECT.CONVERSATION,
        ]);
    });
});

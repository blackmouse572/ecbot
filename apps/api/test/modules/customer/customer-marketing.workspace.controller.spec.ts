import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../src/modules/client-credential/guards/client-credential.policy.guard';
import { CustomerMarketingClientController } from '../../../src/modules/customer/controllers/customer-marketing.client.controller';
import { CustomerMarketingWorkspaceController } from '../../../src/modules/customer/controllers/customer-marketing.workspace.controller';
import {
    ENUM_CUSTOMER_JOURNEY_STAGE as STAGE,
    ENUM_MARKETING_EVENT_ACTOR as ACTOR,
} from '../../../src/modules/customer/enums/customer-marketing.enum';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';

// The marketing labels over HTTP for the app (operator) and for Client
// credentials (MCP): both read the detail with its reasons and apply an edit
// through the same service call, logged under who made it.

const detail = { stage: STAGE.ASKED_PRICE, freeWindows: [] };

function harness() {
    const marketingService = {
        getDetail: jest.fn(async () => detail),
        applyChange: jest.fn(async () => undefined),
        listEvents: jest.fn(async () => [[{ id: 'e1' }], 41]),
        mapEvents: jest.fn(() => [{ id: 'e1' }]),
    };
    const activityService = { createByUserWithWorkspace: jest.fn() };
    const paginationService = {
        totalPage: jest.fn((total: number, limit: number) =>
            Math.ceil(total / limit)
        ),
    };
    return { marketingService, activityService, paginationService };
}

const workspace = { id: 'w1' } as any;
const change = {
    stage: STAGE.ASKED_PRICE,
    reason: 'khách hỏi giá qua điện thoại',
};

describe('CustomerMarketingWorkspaceController', () => {
    it('returns the labels with their reasons and free windows', async () => {
        const h = harness();
        const controller = new CustomerMarketingWorkspaceController(
            h.marketingService as any,
            h.activityService as any,
            h.paginationService as any
        );
        expect(await controller.get(workspace, 'c1')).toEqual({ data: detail });
        expect(h.marketingService.getDetail).toHaveBeenCalledWith('c1', 'w1');
    });

    it('applies an operator edit with its reason and logs it', async () => {
        const h = harness();
        const controller = new CustomerMarketingWorkspaceController(
            h.marketingService as any,
            h.activityService as any,
            h.paginationService as any
        );
        const user = { id: 'u1' } as any;

        const result = await controller.update(workspace, 'c1', change, user);

        expect(h.marketingService.applyChange).toHaveBeenCalledWith(
            'c1',
            'w1',
            change,
            { actor: ACTOR.OPERATOR, reason: change.reason, userId: 'u1' }
        );
        expect(
            h.activityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(
            user,
            workspace,
            expect.objectContaining({ metadata: { id: 'c1' } })
        );
        expect(result).toEqual({ data: detail });
    });
});

describe('CustomerMarketingClientController', () => {
    const credential = { createdBy: { id: 'creator-1' } } as any;
    const build = (h: ReturnType<typeof harness>) =>
        new CustomerMarketingClientController(
            h.marketingService as any,
            h.activityService as any,
            h.paginationService as any
        );

    it('is mounted at /customers/:id/marketing', () => {
        expect(
            Reflect.getMetadata(
                PATH_METADATA,
                CustomerMarketingClientController
            )
        ).toBe('/customers/:id/marketing');
    });

    it.each([
        ['get', ENUM_POLICY_ACTION.READ],
        ['listEvents', ENUM_POLICY_ACTION.READ],
        ['update', ENUM_POLICY_ACTION.UPDATE],
    ] as const)(
        '%s needs the credential and CUSTOMER %s, as the workspace route',
        (handler, action) => {
            const method = CustomerMarketingClientController.prototype[handler];
            expect(Reflect.getMetadata(GUARDS_METADATA, method)).toEqual([
                ClientCredentialGuard,
                ClientCredentialPolicyGuard,
            ]);
            expect(
                Reflect.getMetadata(
                    CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                    method
                )
            ).toEqual([
                { subject: ENUM_POLICY_SUBJECT.CUSTOMER, action: [action] },
            ]);
        }
    );

    it('reads the labels of the credential workspace', async () => {
        const h = harness();
        expect(await build(h).get(workspace, 'c1')).toEqual({ data: detail });
        expect(h.marketingService.getDetail).toHaveBeenCalledWith('c1', 'w1');
    });

    it('records an edit as CLIENT, made by the credential creator', async () => {
        const h = harness();

        await build(h).update(workspace, credential, 'c1', change);

        expect(h.marketingService.applyChange).toHaveBeenCalledWith(
            'c1',
            'w1',
            change,
            {
                actor: ACTOR.CLIENT,
                reason: change.reason,
                userId: 'creator-1',
            }
        );
        expect(
            h.activityService.createByUserWithWorkspace
        ).toHaveBeenCalledWith(
            credential.createdBy,
            workspace,
            expect.objectContaining({ metadata: { id: 'c1' } })
        );
    });

    it('pages the history newest first', async () => {
        const h = harness();

        const result = await build(h).listEvents(workspace, 'c1', {
            _limit: 20,
            _offset: 20,
            _order: { createdAt: 'DESC' },
        } as any);

        expect(h.marketingService.listEvents).toHaveBeenCalledWith('c1', 'w1', {
            paging: { limit: 20, offset: 20 },
            order: { createdAt: 'DESC', id: 'DESC' },
        });
        expect(result).toEqual({
            _pagination: { total: 41, totalPage: 3 },
            data: [{ id: 'e1' }],
        });
    });
});

import { NotFoundException } from '@nestjs/common';
import { CustomerMarketingSystemController } from '../../../src/modules/customer/controllers/customer-marketing.system.controller';
import {
    ENUM_CUSTOMER_MARKETING_AGENT_ACTION as ACTION,
    ENUM_CUSTOMER_MARKETING_PERMISSION as PERMISSION,
    ENUM_MARKETING_EVENT_ACTOR as ACTOR,
} from '../../../src/modules/customer/enums/customer-marketing.enum';

// The agent's set_marketing_permission tool: ask once, then record the answer.

describe('CustomerMarketingSystemController', () => {
    const customerRepository = { findOneById: jest.fn() };
    const marketingService = {
        markConsentAsked: jest.fn(),
        getState: jest.fn(),
        setPermission: jest.fn(),
    };
    const controller = new CustomerMarketingSystemController(
        customerRepository as any,
        marketingService as any
    );

    beforeEach(() => {
        jest.clearAllMocks();
        customerRepository.findOneById.mockResolvedValue({
            id: 'c1',
            workspace: { id: 'w1' },
        });
        marketingService.getState.mockResolvedValue({
            permission: PERMISSION.PENDING,
        });
    });

    it('tells the agent when it already asked', async () => {
        marketingService.markConsentAsked.mockResolvedValue({
            alreadyAsked: true,
        });
        await expect(
            controller.setPermission('c1', {
                action: ACTION.ASKED,
                reason: 'order confirmed',
                conversationId: 'conv-1',
            })
        ).resolves.toEqual({
            ok: true,
            permission: PERMISSION.PENDING,
            alreadyAsked: true,
        });
        expect(marketingService.markConsentAsked).toHaveBeenCalledWith(
            'c1',
            'w1',
            {
                actor: ACTOR.BOT,
                reason: 'order confirmed',
                conversationId: 'conv-1',
            }
        );
    });

    it('pauses for 30 days by default', async () => {
        marketingService.setPermission.mockResolvedValue({
            permission: PERMISSION.PAUSED,
        });
        const before = Date.now();
        await controller.setPermission('c1', {
            action: ACTION.PAUSED,
            reason: 'not now',
        });
        const [, , permission, , until] =
            marketingService.setPermission.mock.calls[0];
        expect(permission).toBe(PERMISSION.PAUSED);
        expect((until as Date).getTime() - before).toBeGreaterThanOrEqual(
            30 * 86_400_000 - 1000
        );
    });

    it('records a yes', async () => {
        marketingService.setPermission.mockResolvedValue({
            permission: PERMISSION.GRANTED,
        });
        await controller.setPermission('c1', {
            action: ACTION.GRANTED,
            reason: 'said yes to offers',
        });
        expect(marketingService.setPermission).toHaveBeenCalledWith(
            'c1',
            'w1',
            PERMISSION.GRANTED,
            expect.objectContaining({ actor: ACTOR.BOT }),
            null
        );
    });

    it('404s an unknown customer', async () => {
        customerRepository.findOneById.mockResolvedValue(null);
        await expect(
            controller.setPermission('nope', {
                action: ACTION.GRANTED,
                reason: 'x',
            })
        ).rejects.toBeInstanceOf(NotFoundException);
    });
});

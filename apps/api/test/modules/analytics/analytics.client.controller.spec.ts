import { HttpException, HttpStatus } from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { ENUM_ANALYTICS_RANGE } from '../../../src/modules/analytics/constants/analytics.constant';
import { AnalyticsClientController } from '../../../src/modules/analytics/controllers/analytics.client.controller';
import { ENUM_ANALYTICS_STATUS_CODE_ERROR } from '../../../src/modules/analytics/enums/analytics.status-code.enum';
import { CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY } from '../../../src/modules/client-credential/constants/client-credential.constant';
import { ClientCredentialGuard } from '../../../src/modules/client-credential/guards/client-credential.guard';
import { ClientCredentialPolicyGuard } from '../../../src/modules/client-credential/guards/client-credential.policy.guard';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '../../../src/modules/policy/enums/policy.enum';
import { WorkspaceEntity } from '../../../src/modules/workspace/repository/entities/workspace.entity';

// /client surface for the dashboard tabs: same abilities as the workspace
// routes, plus a per-credential budget since each uncached call runs several
// aggregate queries.

const mockAnalyticsService = {
    getConversion: jest.fn(),
    getMarketing: jest.fn(),
    getBot: jest.fn(),
    getCustomers: jest.fn(),
};

const mockRateLimit = { claim: jest.fn() };

const CUSTOMER_READ = {
    subject: ENUM_POLICY_SUBJECT.CUSTOMER,
    action: [ENUM_POLICY_ACTION.READ],
};
const CHATBOT_READ = {
    subject: ENUM_POLICY_SUBJECT.CHATBOT,
    action: [ENUM_POLICY_ACTION.READ],
};

const HANDLERS = [
    ['conversion', 'getConversion', [CUSTOMER_READ]],
    ['marketing', 'getMarketing', [CUSTOMER_READ, CHATBOT_READ]],
    ['bot', 'getBot', [CHATBOT_READ]],
    ['customers', 'getCustomers', [CUSTOMER_READ]],
] as const;

describe('AnalyticsClientController', () => {
    const workspace = { id: 'workspace-1' } as WorkspaceEntity;
    const credential = { id: 'cred-1', createdBy: { id: 'creator-1' } } as any;
    const query = {
        range: ENUM_ANALYTICS_RANGE.DAYS_7,
        timezone: 'Asia/Bangkok',
    };
    let controller: AnalyticsClientController;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRateLimit.claim.mockResolvedValue(true);
        controller = new AnalyticsClientController(
            mockAnalyticsService as any,
            mockRateLimit as any
        );
    });

    it('is mounted at /analytics', () => {
        expect(
            Reflect.getMetadata(PATH_METADATA, AnalyticsClientController)
        ).toBe('/analytics');
    });

    it.each(HANDLERS)(
        '%s needs the same abilities as its workspace route',
        (handler, _method, abilities) => {
            const fn = AnalyticsClientController.prototype[handler];
            expect(Reflect.getMetadata(GUARDS_METADATA, fn)).toEqual([
                ClientCredentialGuard,
                ClientCredentialPolicyGuard,
            ]);
            expect(
                Reflect.getMetadata(
                    CLIENT_CREDENTIAL_POLICY_ABILITY_META_KEY,
                    fn
                )
            ).toEqual(abilities);
        }
    );

    it.each(HANDLERS)(
        '%s returns the section for the credential workspace',
        async (handler, method) => {
            mockAnalyticsService[method].mockResolvedValue({ ok: handler });

            const result = await controller[handler](
                credential,
                workspace,
                query
            );

            expect(mockAnalyticsService[method]).toHaveBeenCalledWith(
                'workspace-1',
                ENUM_ANALYTICS_RANGE.DAYS_7,
                'Asia/Bangkok'
            );
            expect(result).toEqual({ data: { ok: handler } });
        }
    );

    it('counts every tab against one budget per credential', async () => {
        await controller.conversion(credential, workspace, query);
        await controller.bot(credential, workspace, query);

        expect(mockRateLimit.claim).toHaveBeenCalledTimes(2);
        expect(mockRateLimit.claim).toHaveBeenNthCalledWith(
            1,
            'analytics:cred-1',
            20,
            60
        );
        expect(mockRateLimit.claim).toHaveBeenNthCalledWith(
            2,
            'analytics:cred-1',
            20,
            60
        );
    });

    it.each(HANDLERS)(
        '%s answers 429 without querying once the budget is spent',
        async (handler, method) => {
            mockRateLimit.claim.mockResolvedValue(false);

            const error = await controller[handler](
                credential,
                workspace,
                query
            ).catch((e: unknown) => e);

            expect(error).toBeInstanceOf(HttpException);
            expect((error as HttpException).getStatus()).toBe(
                HttpStatus.TOO_MANY_REQUESTS
            );
            expect((error as HttpException).getResponse()).toEqual({
                statusCode: ENUM_ANALYTICS_STATUS_CODE_ERROR.RATE_LIMITED,
                message: 'analytics.error.rateLimited',
            });
            expect(mockAnalyticsService[method]).not.toHaveBeenCalled();
        }
    );
});

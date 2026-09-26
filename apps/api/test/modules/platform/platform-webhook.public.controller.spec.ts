import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { PlatformWebhookPublicController } from '../../../src/modules/platform/controllers/platform-webhook.public.controller';

function mockRes() {
    return {
        type: jest.fn().mockReturnThis(),
        status: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
    };
}

function mockReq() {
    return {
        ip: '127.0.0.1',
        originalUrl:
            '/v1/webhooks/messenger?hub.mode=subscribe&hub.verify_token=v&hub.challenge=123456',
        method: 'GET',
        protocol: 'https',
        headers: {},
        get: () => 'example.com',
    } as any;
}

describe('PlatformWebhookPublicController.verify', () => {
    it("sets Content-Type to text/plain before echoing the platform's hub.challenge", async () => {
        const verifyChallenge = jest.fn(
            () => new Response('123456', { status: 200 })
        );
        const registry = {
            has: jest.fn(() => true),
            get: jest.fn(() => ({
                type: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                verifyChallenge,
            })),
        };
        const controller = new PlatformWebhookPublicController(
            registry as any,
            {} as any
        );
        const res = mockRes();

        await controller.verify('messenger', mockReq(), res as any);

        expect(res.type).toHaveBeenCalledWith('text/plain');
        expect(res.send).toHaveBeenCalledWith('123456');
        const typeOrder = res.type.mock.invocationCallOrder[0];
        const sendOrder = res.send.mock.invocationCallOrder[0];
        expect(typeOrder).toBeLessThan(sendOrder);
    });
});

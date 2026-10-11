import { createHmac } from 'crypto';
import { AccountDataDeletionPublicController } from '../../../../src/modules/account/controllers/account-data-deletion.public.controller';

const APP_SECRET = 'test-app-secret';
const STATUS_URL = 'https://ecbot.dev/en/docs/legal/data-deletion';

function signedRequest(payload: object, secret = APP_SECRET): string {
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', secret)
        .update(encoded)
        .digest()
        .toString('base64url');
    return `${signature}.${encoded}`;
}

function mockResponse() {
    const res = {
        status: jest.fn(),
        json: jest.fn(),
    };
    res.status.mockReturnValue(res);
    res.json.mockReturnValue(res);
    return res;
}

describe('AccountDataDeletionPublicController', () => {
    const accountService = {
        deleteFacebookUserData: jest.fn().mockResolvedValue(1),
    };
    const configService = {
        get: jest.fn((key: string) =>
            key === 'facebook.appSecret'
                ? APP_SECRET
                : key === 'facebook.dataDeletionStatusUrl'
                  ? STATUS_URL
                  : undefined
        ),
    };
    let controller: AccountDataDeletionPublicController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new AccountDataDeletionPublicController(
            accountService as any,
            configService as any
        );
    });

    it('deletes the person and answers Meta with a status url and confirmation code', async () => {
        const res = mockResponse();

        await controller.facebook(
            {
                signed_request: signedRequest({
                    algorithm: 'HMAC-SHA256',
                    issued_at: 1,
                    user_id: 'fb-user-1',
                }),
            },
            res as any
        );

        expect(accountService.deleteFacebookUserData).toHaveBeenCalledWith(
            'fb-user-1'
        );
        expect(res.status).toHaveBeenCalledWith(200);
        const body = res.json.mock.calls[0][0];
        expect(body.confirmation_code).toMatch(/^[A-F0-9]{12}$/);
        expect(body.url).toBe(`${STATUS_URL}?code=${body.confirmation_code}`);
    });

    it('rejects a request that is not signed with our app secret, deleting nothing', async () => {
        const res = mockResponse();

        await controller.facebook(
            {
                signed_request: signedRequest(
                    {
                        algorithm: 'HMAC-SHA256',
                        issued_at: 1,
                        user_id: 'fb-user-1',
                    },
                    'attacker'
                ),
            },
            res as any
        );

        expect(accountService.deleteFacebookUserData).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

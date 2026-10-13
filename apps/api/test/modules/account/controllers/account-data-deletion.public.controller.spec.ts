import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import request from 'supertest';
import { RequestValidationPipe } from '../../../../src/common/request/pipes/request.validation.pipe';
import { AccountService } from '../../../../src/modules/account/services/account.service';
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
        deleteFacebookUserData: jest.fn().mockResolvedValue(['account-1']),
    };
    let statusUrl = STATUS_URL;
    const configService = {
        get: jest.fn((key: string) =>
            key === 'facebook.appSecret'
                ? APP_SECRET
                : key === 'facebook.dataDeletionStatusUrl'
                  ? statusUrl
                  : undefined
        ),
    };
    const valid = () =>
        signedRequest({
            algorithm: 'HMAC-SHA256',
            issued_at: 1,
            user_id: 'fb-user-1',
        });
    let controller: AccountDataDeletionPublicController;

    beforeEach(() => {
        jest.clearAllMocks();
        statusUrl = STATUS_URL;
        controller = new AccountDataDeletionPublicController(
            accountService as any,
            configService as any
        );
    });

    it('deletes the person and answers Meta with a status url and confirmation code', async () => {
        const res = mockResponse();

        await controller.facebook(valid(), res as any);

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
            signedRequest(
                {
                    algorithm: 'HMAC-SHA256',
                    issued_at: 1,
                    user_id: 'fb-user-1',
                },
                'attacker'
            ),
            res as any
        );

        expect(accountService.deleteFacebookUserData).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('answers 400 when signed_request is missing', async () => {
        const res = mockResponse();

        await controller.facebook(undefined, res as any);

        expect(accountService.deleteFacebookUserData).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('keeps a query string the status url already has', async () => {
        statusUrl = `${STATUS_URL}?lang=vi`;
        const res = mockResponse();

        await controller.facebook(valid(), res as any);

        const body = res.json.mock.calls[0][0];
        expect(body.url).toBe(
            `${STATUS_URL}?lang=vi&code=${body.confirmation_code}`
        );
    });

    it('logs the confirmation code and our account ids, never the Facebook user id', async () => {
        const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
        const res = mockResponse();

        await controller.facebook(valid(), res as any);

        const line = log.mock.calls[0][0] as string;
        expect(line).toContain(res.json.mock.calls[0][0].confirmation_code);
        expect(line).toContain('1 login(s)');
        expect(line).toContain('account-1');
        expect(line).not.toContain('fb-user-1');
        log.mockRestore();
    });

    // What Meta really sends: a urlencoded form, through the global pipe.
    describe('over HTTP', () => {
        let app: INestApplication;

        beforeAll(async () => {
            const moduleRef = await Test.createTestingModule({
                controllers: [AccountDataDeletionPublicController],
                providers: [
                    { provide: AccountService, useValue: accountService },
                    { provide: ConfigService, useValue: configService },
                ],
            }).compile();
            app = moduleRef.createNestApplication();
            app.useGlobalPipes(new RequestValidationPipe());
            await app.init();
        });

        afterAll(() => app.close());

        it('accepts the form body, extra fields included, and answers with plain JSON', async () => {
            const res = await request(app.getHttpServer())
                .post('/data-deletion/facebook')
                .type('form')
                .send({ signed_request: valid(), locale: 'vi_VN' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                url: `${STATUS_URL}?code=${res.body.confirmation_code}`,
                confirmation_code: expect.stringMatching(/^[A-F0-9]{12}$/),
            });
            expect(accountService.deleteFacebookUserData).toHaveBeenCalledWith(
                'fb-user-1'
            );
        });

        it('answers 400 to an empty POST', async () => {
            const res = await request(app.getHttpServer()).post(
                '/data-deletion/facebook'
            );

            expect(res.status).toBe(400);
            expect(
                accountService.deleteFacebookUserData
            ).not.toHaveBeenCalled();
        });
    });
});

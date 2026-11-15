import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import type { Response as ExpressResponse } from 'express';
import request from 'supertest';
import { RequestValidationPipe } from '../../../../src/common/request/pipes/request.validation.pipe';
import { AccountService } from '../../../../src/modules/account/services/account.service';
import { AccountDeauthorizationPublicController } from '../../../../src/modules/account/controllers/account-deauthorization.public.controller';

const APP_SECRET = 'test-app-secret';

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

describe('AccountDeauthorizationPublicController', () => {
    const accountService = {
        deauthorizeFacebookUserData: jest.fn().mockResolvedValue(['account-1']),
    };
    const configService = {
        get: jest.fn((key: string) =>
            key === 'facebook.appSecret' ? APP_SECRET : undefined
        ),
    };
    const valid = () =>
        signedRequest({
            algorithm: 'HMAC-SHA256',
            issued_at: 1,
            user_id: 'fb-user-1',
        });
    let controller: AccountDeauthorizationPublicController;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new AccountDeauthorizationPublicController(
            accountService as unknown as AccountService,
            configService as unknown as ConfigService
        );
    });

    it('disconnects the person and answers Meta with 200', async () => {
        const res = mockResponse();

        await controller.facebook(valid(), res as unknown as ExpressResponse);

        expect(accountService.deauthorizeFacebookUserData).toHaveBeenCalledWith(
            'fb-user-1'
        );
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    // Meta retries a non-2xx. Holding nothing for that person is not an
    // error: they may have removed the app before linking anything.
    it('answers 200 when nothing is held for that person', async () => {
        accountService.deauthorizeFacebookUserData.mockResolvedValueOnce([]);
        const res = mockResponse();

        await controller.facebook(valid(), res as unknown as ExpressResponse);

        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('rejects a request that is not signed with our app secret, disconnecting nothing', async () => {
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
            res as unknown as ExpressResponse
        );

        expect(
            accountService.deauthorizeFacebookUserData
        ).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('answers 400 when signed_request is missing', async () => {
        const res = mockResponse();

        await controller.facebook(undefined, res as unknown as ExpressResponse);

        expect(
            accountService.deauthorizeFacebookUserData
        ).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('logs how many logins it disconnected, never the Facebook user id', async () => {
        const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
        const res = mockResponse();

        await controller.facebook(valid(), res as unknown as ExpressResponse);

        const line = log.mock.calls[0][0] as string;
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
                controllers: [AccountDeauthorizationPublicController],
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

        it('accepts the form body, extra fields included, and answers 200', async () => {
            const res = await request(app.getHttpServer())
                .post('/deauthorization/facebook')
                .type('form')
                .send({ signed_request: valid(), locale: 'vi_VN' });

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ success: true });
            expect(
                accountService.deauthorizeFacebookUserData
            ).toHaveBeenCalledWith('fb-user-1');
        });

        it('answers 400 to an empty POST', async () => {
            const res = await request(app.getHttpServer()).post(
                '/deauthorization/facebook'
            );

            expect(res.status).toBe(400);
            expect(
                accountService.deauthorizeFacebookUserData
            ).not.toHaveBeenCalled();
        });
    });
});

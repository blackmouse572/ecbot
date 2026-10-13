import { HttpService } from '@nestjs/axios';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import axios from 'axios';
import { createHmac } from 'crypto';
import request from 'supertest';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { InstagramPlatformAdapter } from '../../../src/modules/platform/adapters/instagram/instagram.platform-adapter';
import { PlatformWebhookPublicController } from '../../../src/modules/platform/controllers/platform-webhook.public.controller';
import { PocSystemController } from '../../../src/modules/platform/controllers/poc.system.controller';
import { PLATFORM_ADAPTER } from '../../../src/modules/platform/interfaces/platform-adapter.interface';
import { InboundInboxService } from '../../../src/modules/platform/services/inbound-inbox.service';
import { MessageProcessorService } from '../../../src/modules/platform/services/message-processor.service';
import { PlatformAdapterRegistry } from '../../../src/modules/platform/services/platform-adapter.registry';
import { ReplyGenerationService } from '../../../src/modules/platform/services/reply-generation.service';

// Boots the real webhook controller, registry and Instagram adapter, and hits
// `/v1/webhooks/instagram` over HTTP the way Meta does.

const APP_SECRET = 'ig-sekret';
const IG_ID = '17841400000000001';

const config = {
    get: (k: string) =>
        ({
            'oauth.instagram.appSecret': APP_SECRET,
            'facebook.webhookSecret': 'vtoken',
        })[k],
};

const body = JSON.stringify({
    object: 'instagram',
    entry: [
        {
            id: IG_ID,
            time: 1760000000000,
            messaging: [
                {
                    sender: { id: '987654321' },
                    recipient: { id: IG_ID },
                    timestamp: 1760000000000,
                    message: { mid: 'aWdfZAG1', text: 'Shop ơi' },
                },
            ],
        },
    ],
});
const sign = (raw: string) =>
    'sha256=' + createHmac('sha256', APP_SECRET).update(raw).digest('hex');

describe('POST/GET /v1/webhooks/instagram', () => {
    let app: INestApplication;
    const inbox = { accept: jest.fn().mockResolvedValue(undefined) };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [PlatformWebhookPublicController],
            providers: [
                PlatformAdapterRegistry,
                { provide: InboundInboxService, useValue: inbox },
                {
                    provide: PLATFORM_ADAPTER,
                    useFactory: () => [
                        new InstagramPlatformAdapter(
                            config as any,
                            new HttpService(axios.create()),
                            { decryptToken: () => 'TOKEN' } as any
                        ),
                    ],
                },
            ],
        }).compile();
        app = moduleRef.createNestApplication({ rawBody: true });
        app.enableVersioning({ type: VersioningType.URI });
        await app.init();
    });

    afterAll(() => app.close());
    beforeEach(() => inbox.accept.mockClear());

    it('answers the subscription handshake', async () => {
        const res = await request(app.getHttpServer())
            .get('/v1/webhooks/instagram')
            .query({
                'hub.mode': 'subscribe',
                'hub.verify_token': 'vtoken',
                'hub.challenge': '1158201444',
            });
        expect(res.status).toBe(200);
        expect(res.text).toBe('1158201444');
    });

    it('rejects a handshake with the wrong verify token', async () => {
        const res = await request(app.getHttpServer())
            .get('/v1/webhooks/instagram')
            .query({
                'hub.mode': 'subscribe',
                'hub.verify_token': 'nope',
                'hub.challenge': '1',
            });
        expect(res.status).toBe(403);
    });

    it('queues a signed DM for the Instagram channel and acks', async () => {
        const res = await request(app.getHttpServer())
            .post('/v1/webhooks/instagram')
            .set('content-type', 'application/json')
            .set('x-hub-signature-256', sign(body))
            .send(body);

        expect(res.status).toBe(200);
        expect(res.text).toBe('EVENT_RECEIVED');
        expect(inbox.accept).toHaveBeenCalledTimes(1);
        expect(inbox.accept).toHaveBeenCalledWith(
            ENUM_ACCOUNT_TYPE.INSTAGRAM_PAGE,
            expect.objectContaining({
                kind: 'message',
                accountKey: IG_ID,
                senderId: '987654321',
                externalMessageId: 'aWdfZAG1',
                text: 'Shop ơi',
            })
        );
    });

    it('refuses a tampered body with 403 and queues nothing', async () => {
        const res = await request(app.getHttpServer())
            .post('/v1/webhooks/instagram')
            .set('content-type', 'application/json')
            .set('x-hub-signature-256', sign(body))
            .send(body.replace('Shop ơi', 'Hacked'));

        expect(res.status).toBe(403);
        expect(inbox.accept).not.toHaveBeenCalled();
    });
});

// The edge Worker queues the raw Instagram request and forwards it to
// /system/poc/inbound; verification and parsing happen there instead.
describe('Instagram webhook through the edge queue consumer', () => {
    let controller: PocSystemController;
    const processor = { process: jest.fn().mockResolvedValue(undefined) };

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [PocSystemController],
            providers: [
                PlatformAdapterRegistry,
                { provide: MessageProcessorService, useValue: processor },
                { provide: ReplyGenerationService, useValue: {} },
                {
                    provide: PLATFORM_ADAPTER,
                    useFactory: () => [
                        new InstagramPlatformAdapter(
                            config as any,
                            new HttpService(axios.create()),
                            { decryptToken: () => 'TOKEN' } as any
                        ),
                    ],
                },
            ],
        }).compile();
        await moduleRef.init(); // the registry collects adapters on init
        controller = moduleRef.get(PocSystemController);
    });

    beforeEach(() => processor.process.mockClear());

    it('verifies and processes a signed DM forwarded by the edge', async () => {
        const res = await controller.inbound({
            platform: 'instagram',
            rawBody: body,
            headers: { 'x-hub-signature-256': sign(body) },
        });

        expect(res).toEqual({ processed: 1 });
        expect(processor.process).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'message',
                accountKey: IG_ID,
                externalMessageId: 'aWdfZAG1',
            })
        );
    });

    it('drops a forwarded body whose signature does not match', async () => {
        const res = await controller.inbound({
            platform: 'instagram',
            rawBody: body.replace('Shop ơi', 'Hacked'),
            headers: { 'x-hub-signature-256': sign(body) },
        });

        expect(res).toEqual({ processed: 0 });
        expect(processor.process).not.toHaveBeenCalled();
    });
});

import { UnprocessableEntityException } from '@nestjs/common';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { ApiChannelCallbackService } from '../../../src/modules/platform/services/api-channel-callback.service';
import { EgressBlockedError } from '../../../src/common/helper/services/helper.egress.service';
import {
    API_CHANNEL_SIGNATURE_HEADER,
    API_CHANNEL_TIMESTAMP_HEADER,
} from '../../../src/modules/platform/constants/api-channel-callback.constant';

const SIGNING_SECRET = 'signing-secret-plaintext';

function makeAccount(overrides: Record<string, any> = {}) {
    return {
        id: 'acc-1',
        externalId: 'api-key-abc',
        type: ENUM_ACCOUNT_TYPE.API_CHANNEL,
        config: {
            callbackUrl: 'https://third-party.example.com/hook',
            signingSecret: 'ENCRYPTED',
        },
        ...overrides,
    } as any;
}

const payload = {
    accountKey: 'api-key-abc',
    senderId: 'user-9',
    externalId: 'ext-1',
    text: 'hi',
    timestamp: '2026-09-04T10:00:00.000Z',
};

function makeService() {
    const accountService = {
        decryptToken: (v: string) => (v === 'ENCRYPTED' ? SIGNING_SECRET : v),
    };
    const egress = { fetch: jest.fn() };
    const service = new ApiChannelCallbackService(
        accountService as any,
        egress as any
    );
    return { service, accountService, egress };
}

describe('ApiChannelCallbackService.deliver', () => {
    it('throws when the account has no callback URL configured', async () => {
        const { service } = makeService();
        await expect(
            service.deliver(makeAccount({ config: undefined }), payload)
        ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('routes the POST through HelperEgressService with a signed body, never raw axios', async () => {
        const { service, egress } = makeService();
        egress.fetch.mockResolvedValue(new Response(null, { status: 200 }));

        await service.deliver(makeAccount(), payload);

        expect(egress.fetch).toHaveBeenCalledTimes(1);
        const [url, init] = egress.fetch.mock.calls[0];
        expect(url).toBe('https://third-party.example.com/hook');
        expect(init.method).toBe('POST');
        expect(JSON.parse(init.body as string)).toEqual(payload);
        expect(init.headers[API_CHANNEL_SIGNATURE_HEADER]).toEqual(
            expect.any(String)
        );
        expect(init.headers[API_CHANNEL_TIMESTAMP_HEADER]).toBe(
            payload.timestamp
        );
    });

    it('resolves when the callback responds 2xx', async () => {
        const { service, egress } = makeService();
        egress.fetch.mockResolvedValue(new Response(null, { status: 204 }));

        await expect(
            service.deliver(makeAccount(), payload)
        ).resolves.toBeUndefined();
    });

    it('throws (so the caller retries) when the callback responds non-2xx, matching axios-throws-on-error semantics', async () => {
        const { service, egress } = makeService();
        egress.fetch.mockResolvedValue(
            new Response('server error', { status: 500 })
        );

        await expect(service.deliver(makeAccount(), payload)).rejects.toThrow();
    });

    it('propagates EgressBlockedError unchanged so the caller can treat it as permanent', async () => {
        const { service, egress } = makeService();
        egress.fetch.mockRejectedValue(
            new EgressBlockedError('Egress blocked: host is not allowed')
        );

        await expect(
            service.deliver(makeAccount(), payload)
        ).rejects.toBeInstanceOf(EgressBlockedError);
    });
});

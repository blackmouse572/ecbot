import {
    ServiceUnavailableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { AxiosError, AxiosHeaders } from 'axios';
import { ThreadsOAuthService } from '../../../../src/common/threads/services/threads-oauth.service';

const config = {
    get: (k: string) =>
        ({
            'oauth.threads.appId': 'APP_ID',
            'oauth.threads.appSecret': 'APP_SECRET',
            'oauth.threads.redirectUri': 'https://app.example.com/cb',
        })[k],
};

const PROFILE = {
    id: '1789',
    username: 'eccho.shop',
    name: 'Eccho Shop',
    threads_profile_picture_url: 'https://cdn/p.jpg',
};

const axiosError = (status: number) =>
    new AxiosError('fail', 'ERR', undefined, undefined, {
        status,
        data: {},
        statusText: '',
        headers: {},
        config: { headers: new AxiosHeaders() },
    });

function makeService(post: jest.Mock, get: jest.Mock) {
    return new ThreadsOAuthService(
        config as any,
        {
            axiosRef: { post, get },
        } as any
    );
}

describe('ThreadsOAuthService', () => {
    beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(0)));
    afterEach(() => jest.useRealTimers());

    it('swaps the code for a long-lived token and reads the profile', async () => {
        const post = jest
            .fn()
            .mockResolvedValue({ data: { access_token: 'SHORT' } });
        const get = jest
            .fn()
            .mockResolvedValueOnce({
                data: { access_token: 'LONG', expires_in: 5184000 },
            })
            .mockResolvedValueOnce({ data: PROFILE });

        const result = await makeService(post, get).getTokenAndProfile('CODE');

        const [url, body] = post.mock.calls[0];
        expect(url).toBe('https://graph.threads.net/oauth/access_token');
        expect(Object.fromEntries(body)).toEqual({
            client_id: 'APP_ID',
            client_secret: 'APP_SECRET',
            grant_type: 'authorization_code',
            redirect_uri: 'https://app.example.com/cb',
            code: 'CODE',
        });
        expect(get.mock.calls[0][1].params).toEqual({
            grant_type: 'th_exchange_token',
            client_secret: 'APP_SECRET',
            access_token: 'SHORT',
        });
        expect(result).toEqual({
            accessToken: 'LONG',
            tokenExpiresAt: new Date(5184000 * 1000),
            externalId: '1789',
            name: 'Eccho Shop',
            avatar: 'https://cdn/p.jpg',
            link: 'https://www.threads.net/@eccho.shop',
        });
    });

    it('refreshes with the current long-lived token', async () => {
        const get = jest
            .fn()
            .mockResolvedValueOnce({
                data: { access_token: 'NEW', expires_in: 100 },
            })
            .mockResolvedValueOnce({ data: { ...PROFILE, name: '' } });

        const result = await makeService(jest.fn(), get).refreshCredentials(
            'OLD'
        );

        expect(get.mock.calls[0][0]).toBe(
            'https://graph.threads.net/refresh_access_token'
        );
        expect(get.mock.calls[0][1].params).toEqual({
            grant_type: 'th_refresh_token',
            access_token: 'OLD',
        });
        expect(result.accessToken).toBe('NEW');
        expect(result.name).toBe('eccho.shop');
    });

    it('reports a rejected code as 422', async () => {
        const post = jest.fn().mockRejectedValue(axiosError(400));
        await expect(
            makeService(post, jest.fn()).getTokenAndProfile('BAD')
        ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('reports a Threads outage as a retryable 503', async () => {
        const post = jest.fn().mockRejectedValue(axiosError(502));
        await expect(
            makeService(post, jest.fn()).getTokenAndProfile('CODE')
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
});

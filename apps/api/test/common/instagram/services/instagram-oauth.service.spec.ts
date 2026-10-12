import { BadRequestException } from '@nestjs/common';
import { InstagramOAuthService } from '../../../../src/common/instagram/services/instagram-oauth.service';

const config = {
    get: (k: string) =>
        ({
            'oauth.instagram.appId': 'APP',
            'oauth.instagram.appSecret': 'SECRET',
            'oauth.instagram.redirectUri': 'https://app.test/account-callback',
        })[k],
};

const IG_ID = '17841400000000001';
const me = {
    data: {
        id: 'app-scoped-1',
        user_id: IG_ID,
        username: 'lan.shop',
        name: 'Lan Shop',
        profile_picture_url: 'https://p/1',
    },
};

function buildService(
    post: jest.Mock = jest.fn((url: string) =>
        Promise.resolve(
            url.endsWith('/oauth/access_token')
                ? { data: { access_token: 'short', user_id: 'app-scoped-1' } }
                : { data: { success: true } }
        )
    ),
    get: jest.Mock = jest.fn((url: string) =>
        Promise.resolve(
            url.endsWith('/me')
                ? me
                : { data: { access_token: 'long', expires_in: 5184000 } }
        )
    )
) {
    return {
        post,
        get,
        service: new InstagramOAuthService(
            config as any,
            { axiosRef: { get, post } } as any
        ),
    };
}

describe('InstagramOAuthService.getTokenAndProfile', () => {
    it('keys the account by the professional account id that webhooks carry', async () => {
        const { service } = buildService();
        const result = await service.getTokenAndProfile('code');
        expect(result).toMatchObject({
            accessToken: 'long',
            externalId: IG_ID,
            name: 'Lan Shop',
            avatar: 'https://p/1',
            link: 'https://www.instagram.com/lan.shop',
        });
    });

    it('subscribes the account to message webhooks', async () => {
        const { service, post } = buildService();
        await service.getTokenAndProfile('code');
        const call = post.mock.calls.find(([url]) =>
            url.endsWith('/me/subscribed_apps')
        );
        expect(call).toBeDefined();
        expect(call[2].params).toEqual({
            subscribed_fields:
                'messages,messaging_postbacks,message_reactions,messaging_seen',
            access_token: 'long',
        });
    });

    it('fails the link when the webhook subscription is refused', async () => {
        const post = jest.fn((url: string) =>
            url.endsWith('/oauth/access_token')
                ? Promise.resolve({ data: { access_token: 'short' } })
                : Promise.reject(new Error('denied'))
        );
        const { service } = buildService(post);
        await expect(service.getTokenAndProfile('code')).rejects.toThrow(
            BadRequestException
        );
    });
});

describe('InstagramOAuthService.refreshCredentials', () => {
    it('keeps the professional account id as externalId', async () => {
        const { service } = buildService();
        const result = await service.refreshCredentials('old');
        expect(result).toMatchObject({
            accessToken: 'long',
            externalId: IG_ID,
        });
    });
});

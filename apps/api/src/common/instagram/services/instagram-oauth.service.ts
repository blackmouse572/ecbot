import {
    IOAuthPlatformService,
    IOAuthTokenResult,
} from '@app/common/oauth/interfaces/oauth-platform.interface';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/*
 * Instagram platform — OAuth only (done).
 *
 * TODO(instagram-chat): Implement the messaging capabilities on InstagramPlatformAdapter
 * (apps/api/src/modules/platform/adapters/instagram/instagram.platform-adapter.ts).
 * Instagram uses the Meta Graph API (graph.instagram.com); the PSID concept matches Messenger,
 * so MessengerPlatformAdapter is the closest reference.
 */
@Injectable()
export class InstagramOAuthService implements IOAuthPlatformService {
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly redirectUri: string;
    private readonly baseUrl = 'https://api.instagram.com';
    private readonly graphUrl = 'https://graph.instagram.com';

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService
    ) {
        this.appId = configService.get<string>('oauth.instagram.appId');
        this.appSecret = configService.get<string>('oauth.instagram.appSecret');
        this.redirectUri = configService.get<string>(
            'oauth.instagram.redirectUri'
        );
    }

    async getTokenAndProfile(code: string): Promise<IOAuthTokenResult> {
        // Exchange short-lived token
        const tokenResponse = await this.httpService.axiosRef.post(
            `${this.baseUrl}/oauth/access_token`,
            new URLSearchParams({
                client_id: this.appId,
                client_secret: this.appSecret,
                grant_type: 'authorization_code',
                redirect_uri: this.redirectUri,
                code,
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const shortLivedToken = tokenResponse.data.access_token;
        const userId = tokenResponse.data.user_id;

        // Exchange for long-lived token (60 days)
        const longLivedResponse = await this.httpService.axiosRef.get(
            `${this.graphUrl}/access_token`,
            {
                params: {
                    grant_type: 'ig_exchange_token',
                    client_secret: this.appSecret,
                    access_token: shortLivedToken,
                },
            }
        );

        const accessToken = longLivedResponse.data.access_token;
        const expiresIn: number = longLivedResponse.data.expires_in; // seconds
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

        // Fetch user profile
        const profileResponse = await this.httpService.axiosRef.get(
            `${this.graphUrl}/me`,
            {
                params: {
                    fields: 'id,name,profile_picture_url',
                    access_token: accessToken,
                },
            }
        );

        const profile = profileResponse.data;

        return {
            accessToken,
            tokenExpiresAt,
            externalId: String(userId || profile.id),
            name: profile.name,
            avatar: profile.profile_picture_url,
            link: `https://www.instagram.com/${profile.username || profile.id}`,
        };
    }

    async refreshCredentials(accessToken: string): Promise<IOAuthTokenResult> {
        // Instagram long-lived tokens are refreshed using the current access token
        const response = await this.httpService.axiosRef.get(
            `${this.graphUrl}/refresh_access_token`,
            {
                params: {
                    grant_type: 'ig_refresh_token',
                    access_token: accessToken,
                },
            }
        );

        const newAccessToken = response.data.access_token;
        const expiresIn: number = response.data.expires_in;
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

        const profileResponse = await this.httpService.axiosRef.get(
            `${this.graphUrl}/me`,
            {
                params: {
                    fields: 'id,name,profile_picture_url',
                    access_token: newAccessToken,
                },
            }
        );

        const profile = profileResponse.data;

        return {
            accessToken: newAccessToken,
            tokenExpiresAt,
            externalId: String(profile.id),
            name: profile.name,
            avatar: profile.profile_picture_url,
        };
    }
}

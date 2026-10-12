import {
    IOAuthPlatformService,
    IOAuthTokenResult,
} from '@app/common/oauth/interfaces/oauth-platform.interface';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const GRAPH_API_VERSION = 'v23.0';
const SUBSCRIBED_FIELDS =
    'messages,messaging_postbacks,message_reactions,messaging_seen';

interface InstagramProfile {
    /** The professional account id: webhooks carry it as `entry.id`. */
    user_id: string;
    username: string;
    name?: string;
    profile_picture_url?: string;
}

/**
 * Links an Instagram professional account through Instagram Login
 * (`instagram_business_basic`, `instagram_business_manage_messages`).
 * Messaging lives in InstagramPlatformAdapter.
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

        // Exchange for long-lived token (60 days)
        const longLivedResponse = await this.httpService.axiosRef.get(
            `${this.graphUrl}/access_token`,
            {
                params: {
                    grant_type: 'ig_exchange_token',
                    client_secret: this.appSecret,
                    access_token: tokenResponse.data.access_token,
                },
            }
        );

        const accessToken = longLivedResponse.data.access_token;
        const expiresIn: number = longLivedResponse.data.expires_in; // seconds

        // Without the subscription Instagram sends no message webhooks for
        // this account, so a failure here must fail the link.
        await this.subscribeWebhooks(accessToken);

        return this.toResult(
            accessToken,
            new Date(Date.now() + expiresIn * 1000),
            await this.getProfile(accessToken)
        );
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

        return this.toResult(
            newAccessToken,
            new Date(Date.now() + expiresIn * 1000),
            await this.getProfile(newAccessToken)
        );
    }

    private async getProfile(accessToken: string): Promise<InstagramProfile> {
        const response = await this.httpService.axiosRef.get<InstagramProfile>(
            `${this.graphUrl}/${GRAPH_API_VERSION}/me`,
            {
                params: {
                    fields: 'user_id,username,name,profile_picture_url',
                    access_token: accessToken,
                },
            }
        );
        return response.data;
    }

    private async subscribeWebhooks(accessToken: string): Promise<void> {
        try {
            await this.httpService.axiosRef.post(
                `${this.graphUrl}/${GRAPH_API_VERSION}/me/subscribed_apps`,
                null,
                {
                    params: {
                        subscribed_fields: SUBSCRIBED_FIELDS,
                        access_token: accessToken,
                    },
                }
            );
        } catch {
            throw new BadRequestException({
                statusCode: 400,
                message: 'instagram.error.webhookSubscriptionFailed',
            });
        }
    }

    private toResult(
        accessToken: string,
        tokenExpiresAt: Date,
        profile: InstagramProfile
    ): IOAuthTokenResult {
        return {
            accessToken,
            tokenExpiresAt,
            externalId: String(profile.user_id),
            name: profile.name || profile.username,
            avatar: profile.profile_picture_url,
            link: `https://www.instagram.com/${profile.username}`,
        };
    }
}

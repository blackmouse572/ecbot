import {
    IOAuthPlatformService,
    IOAuthTokenResult,
} from '@app/common/oauth/interfaces/oauth-platform.interface';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const GRAPH_API_VERSION = 'v23.0';
// Instagram documents long-lived tokens as 60 days.
const DEFAULT_EXPIRES_IN = 60 * 24 * 60 * 60;
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
    private readonly logger = new Logger(InstagramOAuthService.name);
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
        const { accessToken, expiresIn } = await this.exchangeCode(code);

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
        const tokenExpiresAt = new Date(
            Date.now() + (response.data.expires_in ?? DEFAULT_EXPIRES_IN) * 1000
        );

        // The token is already rotated: a failed profile lookup must not
        // throw it away. The scheduler only stores the token and expiry.
        try {
            return this.toResult(
                newAccessToken,
                tokenExpiresAt,
                await this.getProfile(newAccessToken)
            );
        } catch (error) {
            this.logger.warn(
                `Instagram profile lookup after refresh failed: ${error?.message ?? error}`
            );
            return {
                accessToken: newAccessToken,
                tokenExpiresAt,
                externalId: '',
                name: '',
            };
        }
    }

    async onUnlink(accessToken: string): Promise<void> {
        try {
            await this.httpService.axiosRef.delete(
                `${this.graphUrl}/${GRAPH_API_VERSION}/me/subscribed_apps`,
                { params: { access_token: accessToken } }
            );
        } catch (error) {
            this.logger.warn(
                `Instagram webhook unsubscribe failed: ${error?.message ?? error}`
            );
        }
    }

    /** Code to short-lived token, then to a long-lived (60 day) token. */
    private async exchangeCode(
        code: string
    ): Promise<{ accessToken: string; expiresIn: number }> {
        try {
            const tokenResponse = await this.httpService.axiosRef.post(
                `${this.baseUrl}/oauth/access_token`,
                new URLSearchParams({
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    grant_type: 'authorization_code',
                    redirect_uri: this.redirectUri,
                    code,
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );
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
            return {
                accessToken: longLivedResponse.data.access_token,
                expiresIn:
                    longLivedResponse.data.expires_in ?? DEFAULT_EXPIRES_IN,
            };
        } catch (error) {
            this.logger.warn(
                `Instagram code exchange failed: ${error?.message ?? error}`
            );
            throw new BadRequestException({
                statusCode: 400,
                message: 'instagram.error.linkFailed',
            });
        }
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

import {
    IOAuthPlatformService,
    IOAuthTokenResult,
} from '@app/common/oauth/interfaces/oauth-platform.interface';
import { ThreadsProfile } from '@app/modules/platform/adapters/threads/threads.types';
import { HttpService } from '@nestjs/axios';
import {
    Injectable,
    ServiceUnavailableException,
    UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';

const THREADS_OAUTH_URL = 'https://graph.threads.net';
const THREADS_GRAPH_URL = `${THREADS_OAUTH_URL}/v1.0`;

interface ThreadsTokenResponse {
    access_token: string;
    expires_in?: number;
}

/**
 * Links a Threads profile through Threads Login. The short-lived code token is
 * swapped for a 60-day one, which the refresh scheduler extends before it
 * lapses. Webhooks are subscribed once per Meta app, not per profile, so
 * nothing is registered here: authorizing the app is what routes the
 * profile's replies and mentions to us.
 */
@Injectable()
export class ThreadsOAuthService implements IOAuthPlatformService {
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly redirectUri: string;

    constructor(
        config: ConfigService,
        private readonly http: HttpService
    ) {
        this.appId = config.get<string>('oauth.threads.appId');
        this.appSecret = config.get<string>('oauth.threads.appSecret');
        this.redirectUri = config.get<string>('oauth.threads.redirectUri');
    }

    async getTokenAndProfile(code: string): Promise<IOAuthTokenResult> {
        const shortLived = await this.call(() =>
            this.http.axiosRef.post<ThreadsTokenResponse>(
                `${THREADS_OAUTH_URL}/oauth/access_token`,
                new URLSearchParams({
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    grant_type: 'authorization_code',
                    redirect_uri: this.redirectUri,
                    code,
                })
            )
        );
        const longLived = await this.call(() =>
            this.http.axiosRef.get<ThreadsTokenResponse>(
                `${THREADS_OAUTH_URL}/access_token`,
                {
                    params: {
                        grant_type: 'th_exchange_token',
                        client_secret: this.appSecret,
                        access_token: shortLived.access_token,
                    },
                }
            )
        );
        return this.withProfile(longLived);
    }

    async refreshCredentials(accessToken: string): Promise<IOAuthTokenResult> {
        const refreshed = await this.call(() =>
            this.http.axiosRef.get<ThreadsTokenResponse>(
                `${THREADS_OAUTH_URL}/refresh_access_token`,
                {
                    params: {
                        grant_type: 'th_refresh_token',
                        access_token: accessToken,
                    },
                }
            )
        );
        return this.withProfile(refreshed);
    }

    private async withProfile(
        token: ThreadsTokenResponse
    ): Promise<IOAuthTokenResult> {
        const profile = await this.call(() =>
            this.http.axiosRef.get<ThreadsProfile>(`${THREADS_GRAPH_URL}/me`, {
                params: {
                    fields: 'id,username,name,threads_profile_picture_url',
                    access_token: token.access_token,
                },
            })
        );
        return {
            accessToken: token.access_token,
            tokenExpiresAt: token.expires_in
                ? new Date(Date.now() + token.expires_in * 1000)
                : undefined,
            externalId: String(profile.id),
            name: profile.name || profile.username,
            avatar: profile.threads_profile_picture_url,
            link: `https://www.threads.net/@${profile.username}`,
        };
    }

    /** A Threads 4xx is a bad code or token (422); anything else may pass on
     *  a retry (503). */
    private async call<T>(request: () => Promise<{ data: T }>): Promise<T> {
        try {
            return (await request()).data;
        } catch (error) {
            const status = isAxiosError(error) ? error.response?.status : 0;
            if (status && status >= 400 && status < 500) {
                throw new UnprocessableEntityException({
                    message: 'threads.error.invalidCredential',
                    statusCode: 422,
                });
            }
            throw new ServiceUnavailableException({
                message: 'threads.error.unreachable',
            });
        }
    }
}

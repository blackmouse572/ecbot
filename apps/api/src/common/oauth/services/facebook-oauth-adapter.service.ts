import { FacebookAuthService } from '@app/common/facebook/services/facebook-auth.service';
import {
    IOAuthPlatformService,
    IOAuthTokenResult,
} from '@app/common/oauth/interfaces/oauth-platform.interface';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const FACEBOOK_TOKEN_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

@Injectable()
export class FacebookOAuthAdapterService implements IOAuthPlatformService {
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly baseGraphApiUrl: string;

    constructor(
        private readonly facebookAuthService: FacebookAuthService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        const version = this.configService.get<string>(
            'facebook.graphApiVersion',
            'v23.0'
        );
        this.appId = this.configService.get<string>('facebook.appId');
        this.appSecret = this.configService.get<string>('facebook.appSecret');
        this.baseGraphApiUrl = `https://graph.facebook.com/${version}`;
    }

    async getTokenAndProfile(code: string): Promise<IOAuthTokenResult> {
        const accessToken = await this.facebookAuthService.getAccessToken(code);
        const profile =
            await this.facebookAuthService.getUserProfile(accessToken);

        return {
            accessToken,
            tokenExpiresAt: new Date(Date.now() + FACEBOOK_TOKEN_TTL_MS),
            externalId: profile.id,
            name: profile.name,
            avatar: profile.picture?.data?.url,
            link: `https://www.facebook.com/${profile.id}`,
        };
    }

    async refreshCredentials(accessToken: string): Promise<IOAuthTokenResult> {
        // Facebook long-lived tokens are extended by exchanging the current access token
        const response = await this.httpService.axiosRef.get(
            `${this.baseGraphApiUrl}/oauth/access_token`,
            {
                params: {
                    grant_type: 'fb_exchange_token',
                    client_id: this.appId,
                    client_secret: this.appSecret,
                    fb_exchange_token: accessToken,
                },
            }
        );

        const newAccessToken: string = response.data.access_token;
        // FB returns expires_in in seconds; fall back to 60 days if absent
        const expiresIn: number =
            response.data.expires_in ?? FACEBOOK_TOKEN_TTL_MS / 1000;
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

        const profile =
            await this.facebookAuthService.getUserProfile(newAccessToken);

        return {
            accessToken: newAccessToken,
            tokenExpiresAt,
            externalId: profile.id,
            name: profile.name,
            avatar: profile.picture?.data?.url,
            link: `https://www.facebook.com/${profile.id}`,
        };
    }
}

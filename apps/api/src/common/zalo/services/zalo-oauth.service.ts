import {
    IOAuthPlatformService,
    IOAuthTokenResult,
} from '@app/common/oauth/interfaces/oauth-platform.interface';
import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/*
 * Zalo Official Account OAuth (v4). Token exchange / refresh lives here.
 * Webhook + messaging live on ZaloPlatformAdapter
 * (apps/api/src/modules/platform/adapters/zalo/zalo.platform-adapter.ts).
 *
 * OA v4 contract (NOT the social /v4/access_token flow):
 *   - POST https://oauth.zaloapp.com/v4/oa/access_token
 *   - `secret_key` goes in the HEADER, not the body
 *   - body: app_id + grant_type + (code | refresh_token); NO redirect_uri
 *   - owner profile via GET https://openapi.zalo.me/v3.0/oa/getoa (access_token header)
 */
@Injectable()
export class ZaloOAuthService implements IOAuthPlatformService {
    private readonly appId: string;
    private readonly appSecret: string;
    private readonly tokenUrl = 'https://oauth.zaloapp.com/v4/oa/access_token';
    private readonly oaInfoUrl = 'https://openapi.zalo.me/v3.0/oa/getoa';

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService
    ) {
        this.appId = configService.get<string>('oauth.zalo.appId');
        this.appSecret = configService.get<string>('oauth.zalo.appSecret');
    }

    async getTokenAndProfile(code: string): Promise<IOAuthTokenResult> {
        const token = await this.requestToken(
            new URLSearchParams({
                app_id: this.appId,
                grant_type: 'authorization_code',
                code,
            })
        );
        return this.buildResult(token);
    }

    async refreshCredentials(
        _accessToken: string,
        refreshToken?: string
    ): Promise<IOAuthTokenResult> {
        const token = await this.requestToken(
            new URLSearchParams({
                app_id: this.appId,
                grant_type: 'refresh_token',
                refresh_token: refreshToken ?? '',
            })
        );
        return this.buildResult(token);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async requestToken(body: URLSearchParams): Promise<{
        access_token?: string;
        refresh_token?: string;
        expires_in?: string | number;
    }> {
        const res = await this.httpService.axiosRef.post(this.tokenUrl, body, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                secret_key: this.appSecret,
            },
        });
        return res.data ?? {};
    }

    private async buildResult(token: {
        access_token?: string;
        refresh_token?: string;
        expires_in?: string | number;
    }): Promise<IOAuthTokenResult> {
        const accessToken = token.access_token;
        // Zalo returns { error, message } (no access_token) on a bad/expired
        // code — surface it as account.error.accessTokenNotFound upstream.
        if (!accessToken) {
            return { accessToken: undefined } as unknown as IOAuthTokenResult;
        }

        const expiresIn = Number(token.expires_in) || 3600;
        const oa = await this.getOaInfo(accessToken);

        return {
            accessToken,
            refreshToken: token.refresh_token,
            tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
            externalId: oa.oa_id ?? '',
            name: oa.name ?? '',
            avatar: oa.avatar,
            link: oa.oa_alias ? `https://zalo.me/${oa.oa_alias}` : undefined,
        };
    }

    private async getOaInfo(accessToken: string): Promise<{
        oa_id?: string;
        name?: string;
        avatar?: string;
        oa_alias?: string;
    }> {
        const res = await this.httpService.axiosRef.get(this.oaInfoUrl, {
            headers: { access_token: accessToken },
        });
        return res.data?.data ?? {};
    }
}

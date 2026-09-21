import {
    IOAuthPlatformService,
    IOAuthTokenResult,
} from '@app/common/oauth/interfaces/oauth-platform.interface';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/*
 * TikTok Shop platform — OAuth only (done).
 *
 * TODO(tiktok-chat): Implement messaging on TiktokPlatformAdapter
 * (apps/api/src/modules/platform/adapters/tiktok/tiktok.platform-adapter.ts).
 *   - TikTok Customer Service API: https://partner.tiktokshop.com/docv2/page/6390a30bac1a080059a6ac5b
 *   - Signature: HMAC-SHA256 on sorted query params + body using app_secret.
 *   - Webhook callback URL must be registered in the TikTok Open Platform portal.
 */
@Injectable()
export class TikTokShopOAuthService implements IOAuthPlatformService {
    private readonly appKey: string;
    private readonly appSecret: string;
    private readonly baseUrl = 'https://auth.tiktok-shops.com/api/v2';

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService
    ) {
        this.appKey = configService.get<string>('oauth.tiktokShop.appKey');
        this.appSecret = configService.get<string>(
            'oauth.tiktokShop.appSecret'
        );
    }

    private generateSign(params: Record<string, string>): string {
        const sortedKeys = Object.keys(params).sort();
        const baseStr =
            this.appSecret +
            sortedKeys.map(k => `${k}${params[k]}`).join('') +
            this.appSecret;
        return crypto
            .createHmac('sha256', this.appSecret)
            .update(baseStr)
            .digest('hex');
    }

    async getTokenAndProfile(code: string): Promise<IOAuthTokenResult> {
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const params: Record<string, string> = {
            app_key: this.appKey,
            auth_code: code,
            grant_type: 'authorized_code',
            timestamp,
        };
        params['sign'] = this.generateSign(params);

        const tokenResponse = await this.httpService.axiosRef.get(
            `${this.baseUrl}/token/get`,
            { params }
        );

        const data = tokenResponse.data.data;
        const rawSellerId = data.seller_id || data.open_id;
        if (!rawSellerId) {
            throw new BadRequestException(
                'TikTok Shop OAuth response is missing both seller_id and open_id. ' +
                    'Ensure the app has the correct permissions and a seller account is being authorized.'
            );
        }

        const accessToken: string = data.access_token;
        const refreshToken: string = data.refresh_token;
        const expiresIn: number = data.access_token_expire_in;
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

        return {
            accessToken,
            refreshToken,
            tokenExpiresAt,
            externalId: String(rawSellerId),
            name: data.seller_name || 'TikTok Shop',
        };
    }

    async refreshCredentials(
        _accessToken: string,
        refreshToken?: string
    ): Promise<IOAuthTokenResult> {
        if (!refreshToken) {
            throw new BadRequestException(
                'TikTok Shop token refresh requires a refresh token, but none is stored for this account.'
            );
        }

        const timestamp = Math.floor(Date.now() / 1000).toString();
        const params: Record<string, string> = {
            app_key: this.appKey,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            timestamp,
        };
        params['sign'] = this.generateSign(params);

        const tokenResponse = await this.httpService.axiosRef.get(
            `${this.baseUrl}/token/refresh`,
            { params }
        );

        const data = tokenResponse.data.data;
        const accessToken: string = data.access_token;
        const newRefreshToken: string = data.refresh_token;
        const expiresIn: number = data.access_token_expire_in;
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

        const rawSellerId = data.seller_id || data.open_id;
        if (!rawSellerId) {
            throw new BadRequestException(
                'TikTok Shop token refresh response is missing both seller_id and open_id.'
            );
        }

        return {
            accessToken,
            refreshToken: newRefreshToken,
            tokenExpiresAt,
            externalId: String(rawSellerId),
            name: data.seller_name || 'TikTok Shop',
        };
    }
}

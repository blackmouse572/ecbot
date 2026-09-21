import {
    IOAuthPlatformService,
    IOAuthTokenResult,
} from '@app/common/oauth/interfaces/oauth-platform.interface';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/*
 * Shopee platform — OAuth only (done).
 *
 * TODO(shopee-chat): Implement messaging on ShopeePlatformAdapter
 * (apps/api/src/modules/platform/adapters/shopee/shopee.platform-adapter.ts).
 *   - Shopee Open Platform Chat API: https://open.shopee.com/documents?module=87&type=2
 *   - Signature: HMAC-SHA256(partner_id + path + timestamp + access_token, partner_key).
 *   - Webhook push_url must be registered in the Shopee partner dashboard.
 */
@Injectable()
export class ShopeeOAuthService implements IOAuthPlatformService {
    private readonly partnerId: string;
    private readonly partnerKey: string;
    private readonly redirectUri: string;
    private readonly baseUrl = 'https://partner.shopeemobile.com/api/v2';

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService
    ) {
        this.partnerId = configService.get<string>('oauth.shopee.partnerId');
        this.partnerKey = configService.get<string>('oauth.shopee.partnerKey');
        this.redirectUri = configService.get<string>(
            'oauth.shopee.redirectUri'
        );
    }

    private generateSign(path: string, timestamp: number): string {
        const baseStr = `${this.partnerId}${path}${timestamp}`;
        return crypto
            .createHmac('sha256', this.partnerKey)
            .update(baseStr)
            .digest('hex');
    }

    async getTokenAndProfile(code: string): Promise<IOAuthTokenResult> {
        const path = '/auth/token/get';
        const timestamp = Math.floor(Date.now() / 1000);
        const sign = this.generateSign(path, timestamp);

        const tokenResponse = await this.httpService.axiosRef.post(
            `${this.baseUrl}${path}`,
            {
                code,
                partner_id: Number(this.partnerId),
                redirect_uri: this.redirectUri,
            },
            {
                params: {
                    partner_id: this.partnerId,
                    timestamp,
                    sign,
                },
            }
        );

        const {
            access_token,
            refresh_token,
            expire_in,
            merchant_id_list,
            shop_id_list,
        } = tokenResponse.data;

        const rawId =
            (merchant_id_list && merchant_id_list[0]) ||
            (shop_id_list && shop_id_list[0]);
        if (!rawId) {
            throw new BadRequestException(
                'Shopee OAuth response is missing both merchant_id and shop_id. ' +
                    'Ensure the app has the correct permissions and the correct account type is being authorized.'
            );
        }

        const tokenExpiresAt = new Date(Date.now() + expire_in * 1000);
        const externalId = String(rawId);

        return {
            accessToken: access_token,
            refreshToken: refresh_token,
            tokenExpiresAt,
            externalId,
            name: `Shopee Shop ${externalId}`,
        };
    }

    async refreshCredentials(
        _accessToken: string,
        refreshToken?: string
    ): Promise<IOAuthTokenResult> {
        if (!refreshToken) {
            throw new BadRequestException(
                'Shopee token refresh requires a refresh token, but none is stored for this account.'
            );
        }

        const path = '/auth/access_token/get';
        const timestamp = Math.floor(Date.now() / 1000);
        const sign = this.generateSign(path, timestamp);

        const tokenResponse = await this.httpService.axiosRef.post(
            `${this.baseUrl}${path}`,
            {
                refresh_token: refreshToken,
                partner_id: Number(this.partnerId),
            },
            {
                params: {
                    partner_id: this.partnerId,
                    timestamp,
                    sign,
                },
            }
        );

        const {
            access_token,
            refresh_token: newRefreshToken,
            expire_in,
            merchant_id_list,
            shop_id_list,
        } = tokenResponse.data;

        const rawId =
            (merchant_id_list && merchant_id_list[0]) ||
            (shop_id_list && shop_id_list[0]);
        if (!rawId) {
            throw new BadRequestException(
                'Shopee token refresh response is missing both merchant_id and shop_id.'
            );
        }

        const tokenExpiresAt = new Date(Date.now() + expire_in * 1000);
        const externalId = String(rawId);

        return {
            accessToken: access_token,
            refreshToken: newRefreshToken,
            tokenExpiresAt,
            externalId,
            name: `Shopee Shop ${externalId}`,
        };
    }
}

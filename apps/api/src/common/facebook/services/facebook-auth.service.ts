import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FacebookAuthInterface } from '../interfaces/facebook-auth.interface';
import { FacebookBaseService } from './facebook-base.service';

@Injectable()
export class FacebookAuthService
    extends FacebookBaseService
    implements FacebookAuthInterface
{
    private readonly logger = new Logger(FacebookAuthService.name);
    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService
    ) {
        super(configService);
    }
    async getAccessToken(code: string): Promise<string> {
        const url = `${this.baseGraphApiUrl}/oauth/access_token`;
        const params = {
            client_id: this.appId,
            client_secret: this.appSecret,
            redirect_uri: this.redirectUri,
            code,
        };

        // Construct the request URL with parameters without encoding
        const queryString = Object.keys(params)
            .map(key => `${key}=${params[key]}`)
            .join('&');

        const requestUrlString = `${url}?${queryString}`;
        try {
            const response =
                await this.httpService.axiosRef.get(requestUrlString);
            return response.data.access_token;
        } catch (error) {
            throw new Error(`Failed to get access token: ${error.message}`);
        }
    }

    async getUserProfile(accessToken: string): Promise<any> {
        const url = `${this.baseGraphApiUrl}/me`;
        const params = {
            access_token: accessToken,
            fields: 'id,name,email,picture',
        };

        try {
            const response = await this.httpService.axiosRef.get(url, {
                params,
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get user profile: ${error.message}`);
        }
    }
}

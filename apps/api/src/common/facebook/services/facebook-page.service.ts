import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import {
    GetFacebookPageRequestDto,
    GetFacebookPagesRequestDto,
} from '../dtos/facebook-page.request.dto';
import { FacebookPageResponseDto } from '../dtos/facebook-page.response.dto';
import { FacebookPageInterface } from '../interfaces/facebook-page.interface';
import { FacebookBaseService } from './facebook-base.service';

@Injectable()
export class FacebookPageService
    extends FacebookBaseService
    implements FacebookPageInterface
{
    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService
    ) {
        super(configService);
    }
    async getPage(data: GetFacebookPageRequestDto) {
        try {
            const url = `${this.baseGraphApiUrl}/${data.pageId}`;
            const response = this.httpService.axiosRef.get<{
                data: FacebookPageResponseDto;
            }>(url, {
                params: {
                    access_token: data.accessToken,
                    fields: 'id,name,category,picture{url,width,height},tasks,access_token,fan_count,link',
                },
            });
            const res = await response;
            return res.data;
        } catch (error) {
            if (error instanceof AxiosError) {
                console.error(
                    'Error fetching Facebook page:',
                    error.response.data
                );
            }
            throw new Error('Failed to fetch Facebook page');
        }
    }

    async getPages(data: GetFacebookPagesRequestDto) {
        try {
            const { userId } = data;
            const url = `${this.baseGraphApiUrl}/${userId ?? 'me'}/accounts`;

            const response = await this.httpService.axiosRef.get<{
                data: FacebookPageResponseDto[];
            }>(url, {
                params: {
                    access_token: data.accessToken,
                    fields: 'id,name,category,picture{url,width,height},tasks,access_token,fan_count,link',
                },
            });
            return response.data.data;
        } catch (error) {
            if (error instanceof AxiosError) {
                console.error(
                    'Error fetching Facebook pages:',
                    error.response.data
                );
            }
            throw new Error('Failed to fetch Facebook pages');
        }
    }
}

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

            type PagesResponse = {
                data: FacebookPageResponseDto[];
                paging?: { next?: string };
            };

            const pages: FacebookPageResponseDto[] = [];
            let nextUrl: string | undefined = url;
            let params: Record<string, string> | undefined = {
                access_token: data.accessToken,
                fields: 'id,name,category,picture{url,width,height},tasks,access_token,fan_count,link',
                limit: '100',
            };
            // Graph API caps each response, so follow paging.next (a full URL
            // that already carries the token and fields) until it runs out.
            while (nextUrl) {
                const response =
                    await this.httpService.axiosRef.get<PagesResponse>(
                        nextUrl,
                        {
                            params,
                        }
                    );
                pages.push(...response.data.data);
                nextUrl = response.data.paging?.next;
                params = undefined;
            }
            return pages;
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

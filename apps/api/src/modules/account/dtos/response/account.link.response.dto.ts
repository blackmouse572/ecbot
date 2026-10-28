import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { AccountGetDetailResponseDto } from './account.detail.response.dto';
import { AccountLinkSkippedPageResponseDto } from './account.link-skipped-page.response.dto';

export class AccountLinkResponseDto extends AccountGetDetailResponseDto {
    @ApiProperty({
        description: 'Facebook pages associated with the account',
        type: [AccountGetDetailResponseDto],
    })
    @IsOptional()
    pages?: any;

    @ApiProperty({
        description:
            'Pages the login manages that another workspace has already connected, so they were not connected here',
        type: [AccountLinkSkippedPageResponseDto],
        required: false,
    })
    @IsOptional()
    skippedPages?: AccountLinkSkippedPageResponseDto[];

    @ApiProperty({
        description: 'Total number of cookies associated with the account',
        example: 5,
    })
    @IsNotEmpty()
    totalCookies: number;

    @ApiProperty({
        description: 'Total number of proxies associated with the account',
        example: 3,
    })
    @IsNotEmpty()
    totalProxies: number;
}

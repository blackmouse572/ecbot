import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { AccountGetDetailResponseDto } from './account.detail.response.dto';

export class AccountLinkResponseDto extends AccountGetDetailResponseDto {
    @ApiProperty({
        description: 'Facebook pages associated with the account',
        example: {},
    })
    @IsOptional()
    pages?: any;

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

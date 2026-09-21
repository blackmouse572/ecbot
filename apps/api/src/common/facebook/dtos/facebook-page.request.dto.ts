import { IsOptional, IsString } from 'class-validator';

export class GetFacebookPagesRequestDto {
    @IsString()
    @IsOptional()
    userId?: string;

    @IsString()
    accessToken: string;
}

export class GetFacebookPageRequestDto {
    @IsString()
    pageId: string;

    @IsString()
    accessToken: string;
}

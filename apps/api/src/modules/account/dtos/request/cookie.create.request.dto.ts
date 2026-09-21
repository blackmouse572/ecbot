import {
    IsBoolean,
    IsDate,
    IsMongoId,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateCookieRequestDto {
    @IsMongoId()
    account: string;

    @IsString()
    status: string;

    @IsOptional()
    @IsString()
    ip?: string;

    @IsOptional()
    @IsBoolean()
    authed?: boolean;

    @IsOptional()
    @IsString()
    label?: string;

    @IsOptional()
    @IsDate()
    lastUpdatedAt?: Date;
}

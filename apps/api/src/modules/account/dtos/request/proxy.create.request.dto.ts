import {
    IsBoolean,
    IsMongoId,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';

export class CreateProxyDto {
    @IsString()
    host: string;

    @IsNumber()
    port: number;

    @IsString()
    status: string;

    @IsString()
    protocol: string;

    @IsOptional()
    @IsBoolean()
    authed?: boolean;

    @IsOptional()
    @IsMongoId()
    addedBy?: string;
}

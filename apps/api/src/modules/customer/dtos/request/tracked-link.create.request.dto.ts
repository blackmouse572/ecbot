import { ApiProperty } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    IsArray,
    IsBoolean,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUrl,
    IsUUID,
    MaxLength,
} from 'class-validator';

export class TrackedLinkCreateRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    @ApiProperty({ example: 'Tờ rơi trong hộp quà Tết' })
    name: string;

    @IsUUID()
    @ApiProperty({ description: 'The channel account customers chat on' })
    accountId: string;

    @IsOptional()
    @IsString()
    @MaxLength(1000)
    @ApiProperty({ type: String, required: false, nullable: true })
    greeting?: string | null;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(10)
    @IsUUID('all', { each: true })
    @ApiProperty({ type: [String], required: false })
    tagIds?: string[];

    @IsOptional()
    @IsBoolean()
    @ApiProperty({ required: false, default: false })
    promisesOffer?: boolean;

    @IsOptional()
    @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
    @MaxLength(2000)
    @ApiProperty({
        type: String,
        required: false,
        nullable: true,
        description: 'Website widget only: the shop page the link opens',
    })
    targetUrl?: string | null;
}

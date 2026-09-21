import { ApiProperty } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsString,
    IsUrl,
    MaxLength,
} from 'class-validator';

export class AccountProvisionApiChannelRequestDto {
    @ApiProperty({
        description: 'Human-friendly name for this integration',
        example: 'Partner CRM',
        required: true,
    })
    @IsNotEmpty()
    @IsString()
    @MaxLength(255)
    name: string;

    @ApiProperty({
        description:
            'HTTPS endpoint the bot reply is POSTed to, signed with x-eccho-signature',
        example: 'https://partner.example.com/eccho/replies',
        required: true,
    })
    @IsNotEmpty()
    // HTTPS only: the payload carries conversation content and the signature
    // is worthless over a channel anyone can read or rewrite.
    // `require_tld: false` so `https://localhost:5173` and internal hostnames
    // validate — validator.js demands a TLD by default, which would block every
    // local or in-cluster receiver. Matches the tool module's URL DTOs.
    @IsUrl({
        protocols: ['https'],
        require_protocol: true,
        require_tld: false,
    })
    @MaxLength(2000)
    callbackUrl: string;
}

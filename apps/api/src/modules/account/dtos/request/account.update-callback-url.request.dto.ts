import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUrl, MaxLength } from 'class-validator';

export class AccountUpdateCallbackUrlRequestDto {
    @ApiProperty({
        description:
            'HTTPS endpoint the bot reply is POSTed to, signed with x-eccho-signature',
        example: 'https://partner.example.com/eccho/replies',
        required: true,
    })
    @IsNotEmpty()
    // Same posture as provision: HTTPS only, no TLD requirement so
    // `https://localhost:5173` and internal hostnames still validate.
    @IsUrl({
        protocols: ['https'],
        require_protocol: true,
        require_tld: false,
    })
    @MaxLength(2000)
    callbackUrl: string;
}

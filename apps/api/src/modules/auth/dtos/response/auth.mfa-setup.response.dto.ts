import { ApiProperty } from '@nestjs/swagger';

export class AuthMfaSetupResponseDto {
    @ApiProperty({
        required: true,
        description: 'Base32 TOTP secret, for manual entry',
        example: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP',
    })
    secret: string;

    @ApiProperty({
        required: true,
        description: 'otpauth:// URI, to render as a QR code',
        example:
            'otpauth://totp/Eccho:jane%40example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Eccho&algorithm=SHA1&digits=6&period=30',
    })
    otpauthUri: string;
}

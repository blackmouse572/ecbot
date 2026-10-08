import { ApiProperty } from '@nestjs/swagger';

export class AuthMfaEnableResponseDto {
    @ApiProperty({
        required: true,
        type: [String],
        description:
            'One-time recovery codes. Shown only once; the server keeps only hashes.',
        example: ['k7m2q-x9p4w', 'b3n8r-t5v2c'],
    })
    recoveryCodes: string[];
}

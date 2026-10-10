import { ApiProperty } from '@nestjs/swagger';

export class AuthMfaEnableResponseDto {
    @ApiProperty({
        required: true,
        type: [String],
        description:
            'One-time recovery codes. Shown only once; the server keeps only hashes.',
        example: ['aaaa-bbbb-cccc-dddd', 'eeee-ffff-gggg-hhhh'],
    })
    recoveryCodes: string[];
}

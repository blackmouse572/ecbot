import { ApiProperty } from '@nestjs/swagger';

export class HealthBuildInfoResponseDto {
    @ApiProperty({
        required: true,
        description: 'Git commit the running image was built from',
        example: 'f8dbd9d2c1e4b7a6d5c3b2a1f0e9d8c7b6a5f4e3',
    })
    commit: string;

    @ApiProperty({
        required: true,
        description: 'Git branch the build ran on',
        example: 'main',
    })
    branch: string;

    @ApiProperty({
        required: true,
        description: 'When the image was built (ISO 8601)',
        example: '2026-11-06T09:00:00Z',
    })
    builtAt: string;
}

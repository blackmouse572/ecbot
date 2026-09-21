import { ApiProperty } from '@nestjs/swagger';

export class AwsS3PresignResponseDto {
    @ApiProperty({
        required: true,
        example: 'https://guilty-cardboard.name/',
    })
    presignUrl: string;

    @ApiProperty({
        required: true,
        example: '/lib/crossly_until_polarisation.htm',
    })
    key: string;

    @ApiProperty({
        required: true,
        example: 10000,
        description: 'Expired in millisecond for each presign url',
    })
    expiredIn: number;

    @ApiProperty({
        required: true,
    })
    mime: string;

    @ApiProperty({
        required: true,
    })
    extension: string;
}

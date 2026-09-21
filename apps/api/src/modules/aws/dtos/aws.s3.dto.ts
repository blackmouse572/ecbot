import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { StreamingBlobTypes } from '@smithy/types';
import { Exclude, Expose, Transform, Type } from 'class-transformer';

export class AwsS3Dto {
    @ApiProperty({
        required: true,
    })
    bucket: string;

    @ApiProperty({
        required: true,
        example: '/usr/libexec/meh_ack.mp4v',
    })
    @Expose({
        groups: ['private'],
    })
    key: string;

    @ApiProperty({
        required: false,
        example: 'https://delicious-volleyball.net/System/home_into.php',
    })
    cdnUrl?: string;

    @ApiProperty({
        required: false,
        example: 'https://wicked-festival.info/boot/upright_early_absent.ogx',
    })
    @Expose({
        groups: ['private'],
    })
    completedUrl: string;

    @ApiProperty({
        required: true,
    })
    mime: string;

    @ApiProperty({
        required: true,
    })
    extension: string;

    @Exclude()
    @ApiHideProperty()
    data?: StreamingBlobTypes & {
        transformToString?: (encode: string) => Promise<string>;
        transformToByteArray?: () => Promise<Buffer>;
        transformToWebStream?: () => Promise<ReadableStream<Buffer>>;
    };

    @ApiProperty({
        required: true,
    })
    @Type(() => String)
    @Transform(({ value }) => Number.parseInt(value))
    size: number;
}

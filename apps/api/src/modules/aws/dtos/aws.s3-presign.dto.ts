import { ApiProperty, PickType } from '@nestjs/swagger';
import { AwsS3Dto } from './aws.s3.dto';

export class AwsS3PresignDto extends PickType(AwsS3Dto, [
    'key',
    'mime',
    'extension',
]) {
    /**
     * Presigned URL for S3 upload
     * @description Temporary URL that allows direct upload to S3 without exposing AWS credentials
     */
    @ApiProperty({
        required: true,
        example: 'https://defensive-citizen.biz/',
        description: 'Presigned URL for uploading the object to S3',
    })
    presignUrl: string;

    /**
     * URL expiration time in milliseconds
     * @description Time in milliseconds after which the presigned URL will expire and become invalid
     */
    @ApiProperty({
        required: true,
        example: 10000,
        description: 'Expired in millisecond for each presign url',
    })
    expiredIn: number;
}

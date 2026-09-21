import { AwsS3ResponseDto } from '@app/modules/aws/dtos/response/aws.s3-response.dto';
import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserMetaResponseDto {
    @ApiProperty({
        required: true,
        maxLength: 100,
        minLength: 1,
    })
    @Expose()
    id: string;

    @ApiProperty({
        required: true,
        maxLength: 100,
        minLength: 1,
    })
    @Expose()
    name: string;

    @ApiProperty({
        required: true,
        maxLength: 50,
        minLength: 3,
    })
    @Expose()
    username: string;

    @ApiProperty({
        required: true,
        example: 'Ceasar5@hotmail.com',
        maxLength: 100,
    })
    @Expose()
    email: string;

    @ApiHideProperty()
    @Expose()
    photo?: AwsS3ResponseDto;

    @ApiHideProperty()
    @Expose()
    createdAt: Date;

    @ApiHideProperty()
    @Expose()
    updatedAt: Date;
}

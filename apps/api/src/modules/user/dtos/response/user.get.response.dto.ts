import { ApiHideProperty, ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Exclude, Type } from 'class-transformer';
import {
    ENUM_USER_GENDER,
    ENUM_USER_SIGN_UP_FROM,
    ENUM_USER_STATUS,
} from 'src/modules/user/enums/user.enum';
import { UserUpdateMobileNumberRequestDto } from 'src/modules/user/dtos/request/user.update-mobile-number.request.dto';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import { UserVerificationResponseDto } from 'src/modules/user/dtos/response/user.verification.response.dto';
import { AwsS3ResponseDto } from 'src/modules/aws/dtos/response/aws.s3-response.dto';

export class UserGetResponseDto extends DatabaseDto {
    @ApiProperty({
        required: true,
        maxLength: 100,
        minLength: 1,
    })
    name: string;

    @ApiProperty({
        required: true,
        maxLength: 50,
        minLength: 3,
    })
    username: string;

    @ApiProperty({
        required: false,
        type: UserUpdateMobileNumberRequestDto,
        oneOf: [{ $ref: getSchemaPath(UserUpdateMobileNumberRequestDto) }],
    })
    @Type(() => UserUpdateMobileNumberRequestDto)
    mobileNumber?: UserUpdateMobileNumberRequestDto;

    @ApiProperty({
        required: true,
        example: 'Aylin81@gmail.com',
        maxLength: 100,
    })
    email: string;

    @ApiProperty({
        required: true,
        example: '627055ae-cbd5-44dc-84de-c9581d7303fa',
    })
    role: string;

    @ApiHideProperty()
    @Exclude()
    password: string;

    @ApiProperty({
        required: true,
        example: new Date('2027-03-18T15:40:13.886Z'),
    })
    passwordExpired: Date;

    @ApiProperty({
        required: true,
        example: new Date('2026-08-28T03:17:45.179Z'),
    })
    passwordCreated: Date;

    @ApiHideProperty()
    @Exclude()
    passwordAttempt: number;

    @ApiProperty({
        required: true,
        example: new Date('2026-08-30T08:54:18.246Z'),
    })
    signUpDate: Date;

    @ApiProperty({
        required: true,
        example: ENUM_USER_SIGN_UP_FROM.ADMIN,
        enum: ENUM_USER_SIGN_UP_FROM,
    })
    signUpFrom: ENUM_USER_SIGN_UP_FROM;

    @ApiHideProperty()
    @Exclude()
    salt: string;

    @ApiProperty({
        required: true,
        example: ENUM_USER_STATUS.ACTIVE,
        enum: ENUM_USER_STATUS,
    })
    status: ENUM_USER_STATUS;

    @ApiProperty({
        required: false,
        example: 'https://avatars.githubusercontent.com/u/51836498',
    })
    avatar?: string;

    @ApiProperty({
        required: false,
        type: AwsS3ResponseDto,
        oneOf: [{ $ref: getSchemaPath(AwsS3ResponseDto) }],
    })
    @Type(() => AwsS3ResponseDto)
    photo?: AwsS3ResponseDto;

    @ApiProperty({
        example: ENUM_USER_GENDER.MALE,
        enum: ENUM_USER_GENDER,
        required: false,
    })
    gender?: ENUM_USER_GENDER;

    @ApiProperty({
        example: 'b3d3242a-a13c-4fe7-8d6f-faa738800d35',
        required: true,
    })
    country: string;

    @ApiProperty({
        example: 'Hodkiewicz',
        required: true,
        type: UserVerificationResponseDto,
        oneOf: [{ $ref: getSchemaPath(UserVerificationResponseDto) }],
    })
    @Type(() => UserVerificationResponseDto)
    verification: UserVerificationResponseDto;
}

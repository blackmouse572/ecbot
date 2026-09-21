import { ApiProperty } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
    MaxLength,
    MinLength,
} from 'class-validator';
import { IsCustomEmail } from 'src/common/request/validations/request.custom-email.validation';
import { ENUM_USER_GENDER } from 'src/modules/user/enums/user.enum';

export class UserCreateRequestDto {
    @ApiProperty({
        example: 'Arvel74@yahoo.com',
        required: true,
        maxLength: 100,
    })
    @IsCustomEmail()
    @IsNotEmpty()
    @MaxLength(100)
    email: string;

    @ApiProperty({
        example: '8a374397-303d-4f05-9c53-1f56bc9fa153',
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    role: string;

    @ApiProperty({
        example: 'Dr. Inez Dibbert',
        required: true,
        maxLength: 100,
        minLength: 1,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(100)
    name: string;

    @ApiProperty({
        example: '6c178210-85e5-4b5f-b63b-615f959c70a8',
        required: true,
    })
    @IsString()
    @IsUUID()
    @IsNotEmpty()
    country: string;

    @ApiProperty({
        required: true,
        enum: ENUM_USER_GENDER,
        example: ENUM_USER_GENDER.MALE,
    })
    @IsString()
    @IsEnum(ENUM_USER_GENDER)
    @IsNotEmpty()
    gender: ENUM_USER_GENDER;

    @ApiProperty({
        example: 'https://avatars.githubusercontent.com/u/57978925',
        required: false,
    })
    @IsOptional()
    avatar?: string;

    @ApiProperty({
        type: 'string',
        required: false,
        format: 'binary',
        description: 'Image file to upload',
    })
    @IsOptional()
    image?: string;
}

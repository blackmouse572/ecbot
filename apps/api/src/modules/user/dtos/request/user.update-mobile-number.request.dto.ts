import { ApiProperty, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';

export class UserUpdateMobileNumberRequestDto extends PickType(
    UserCreateRequestDto,
    ['country'] as const
) {
    @ApiProperty({
        example: '62859951591182',
        required: true,
        maxLength: 20,
        minLength: 8,
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @MaxLength(22)
    number: string;
}

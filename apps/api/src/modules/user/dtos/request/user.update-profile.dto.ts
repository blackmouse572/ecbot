import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { UserCreateRequestDto } from 'src/modules/user/dtos/request/user.create.request.dto';

// Gender is optional: sign-up never asks for it, so most users have none.
export class UserUpdateProfileRequestDto extends IntersectionType(
    PickType(UserCreateRequestDto, [
        'name',
        'country',
        'avatar',
        'image',
    ] as const),
    PartialType(PickType(UserCreateRequestDto, ['gender'] as const))
) {}

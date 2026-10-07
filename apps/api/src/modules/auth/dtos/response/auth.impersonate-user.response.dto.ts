import { ApiProperty } from '@nestjs/swagger';

export class AuthImpersonateUserDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    email: string;
}

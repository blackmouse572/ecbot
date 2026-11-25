import { ApiProperty } from '@nestjs/swagger';

export class AuthAdminUpdatePasswordResponseDto {
    @ApiProperty({
        required: false,
        description:
            'New temporary password, shown to the admin once. Absent when the admin typed the password',
        example: 'aB3$kL9!xQ',
    })
    password?: string;
}

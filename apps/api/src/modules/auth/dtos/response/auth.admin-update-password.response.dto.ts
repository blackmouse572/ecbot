import { ApiProperty } from '@nestjs/swagger';

export class AuthAdminUpdatePasswordResponseDto {
    @ApiProperty({
        required: true,
        description: 'New temporary password, shown to the admin once',
        example: 'aB3$kL9!xQ',
    })
    password: string;
}

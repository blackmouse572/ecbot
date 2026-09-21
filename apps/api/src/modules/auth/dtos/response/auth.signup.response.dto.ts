import { ApiProperty } from '@nestjs/swagger';

export class AuthSignUpResponseDto {
    @ApiProperty({
        required: true,
    })
    userId: string;
}

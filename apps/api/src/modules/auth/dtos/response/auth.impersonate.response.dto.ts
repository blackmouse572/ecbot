import { ApiProperty } from '@nestjs/swagger';

export class AuthImpersonateResponseDto {
    @ApiProperty({ required: true, description: 'Single-use hand-off code' })
    code: string;

    @ApiProperty({ required: true, example: 600, description: 'Seconds' })
    expiresIn: number;
}

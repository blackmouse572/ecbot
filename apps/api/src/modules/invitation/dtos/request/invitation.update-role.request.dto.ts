import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateInvitationRoleRequestDto {
    @ApiProperty({
        example: '60f7b3b9d8c4a5e9c8b8e1a2',
        description: 'The new role ID to assign to the invitation',
        required: false,
    })
    @IsString()
    @IsOptional()
    roleId?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    MinLength,
} from 'class-validator';

export class WorkSpaceInviteMemberRequestDto {
    @ApiProperty({
        example: "Member's email",
        description: 'The email of the member to be invited',
        maxLength: 255,
        required: true,
    })
    @IsEmail()
    @IsNotEmpty()
    @MinLength(1)
    @MaxLength(255)
    invitedEmail: string;

    @ApiProperty({
        example: '60f7b3b9d8c4a5e9c8b8e1a2',
        description:
            'The role ID to assign to the invited membe, else default is first member role of the workspace',
        required: false,
    })
    @IsString()
    @IsOptional()
    roleId?: string;
}

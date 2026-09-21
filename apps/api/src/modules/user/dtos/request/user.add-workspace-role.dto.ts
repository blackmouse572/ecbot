import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UserAddWorkspaceRoleRequestDto {
    @ApiProperty({
        description: 'The ID of the workspace',
        example: 'workspaceId123',
    })
    @IsString()
    workspaceId: string;

    @ApiProperty({
        description: 'The ID of the role to add',
        example: 'roleId123',
    })
    @IsString()
    roleId: string;
}

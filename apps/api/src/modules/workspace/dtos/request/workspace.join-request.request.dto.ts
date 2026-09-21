import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class WorkspaceJoinRequestDto {
    @ApiProperty({
        description: 'Optional reason for joining the workspace',
        example:
            'I would like to join this workspace to collaborate on the project.',
        required: false,
        type: String,
    })
    @IsString()
    @IsOptional()
    @MinLength(1)
    readonly reason?: string;
}

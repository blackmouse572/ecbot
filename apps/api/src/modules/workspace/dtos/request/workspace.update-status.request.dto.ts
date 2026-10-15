import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ENUM_WORKSPACE_STATUS } from '../../enums/workspace.enum';

export class WorkspaceUpdateStatusRequestDto {
    @ApiProperty({
        enum: ENUM_WORKSPACE_STATUS,
        example: ENUM_WORKSPACE_STATUS.SUSPENDED,
    })
    @IsEnum(ENUM_WORKSPACE_STATUS)
    @IsNotEmpty()
    status: ENUM_WORKSPACE_STATUS;
}

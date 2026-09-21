import { ApiHideProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { WorkSpaceGetResponseDto } from './workspace.get.response';

export class WorkSpaceListResponseDto extends WorkSpaceGetResponseDto {
    @ApiHideProperty()
    @Exclude()
    createdAt: Date;

    @ApiHideProperty()
    @Exclude()
    updatedAt: Date;
}

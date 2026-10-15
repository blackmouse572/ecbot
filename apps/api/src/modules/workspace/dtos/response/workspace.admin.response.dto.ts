import { ApiProperty, PickType } from '@nestjs/swagger';
import { WorkSpaceGetResponseDto } from './workspace.get.response';

export class WorkspaceAdminResponseDto extends PickType(
    WorkSpaceGetResponseDto,
    ['id', 'name', 'avatar', 'slug', 'owner', 'createdAt', 'updatedAt'] as const
) {
    @ApiProperty({ example: 3, description: 'Active members, owner included' })
    memberCount: number;

    @ApiProperty({ example: 2 })
    chatbotCount: number;

    @ApiProperty({
        example: 50000,
        description: 'Tokens granted outside the plan quota',
    })
    tokenCreditBalance: number;
}

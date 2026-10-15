import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ActivityAdminWorkspaceResponseDto } from 'src/modules/activity/dtos/response/activity.admin-workspace.response.dto';

// One row of the admin customer tag list, with how many customers carry it.
export class CustomerTagAdminListResponseDto {
    @ApiProperty({ example: 'e572d33e-dbc3-45f2-857b-1ce34654d81c' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Khách VIP' })
    @Expose()
    name: string;

    @ApiPropertyOptional({ example: '⭐' })
    @Expose()
    emoji?: string;

    @ApiPropertyOptional({ example: 'Khách mua trên 5 lần' })
    @Expose()
    description?: string;

    @ApiProperty({
        example: false,
        description: 'Applying the tag hands the conversation to the team',
    })
    @Expose()
    triggersHandoff: boolean;

    @ApiProperty({
        example: true,
        description: 'Applying the tag notifies the team',
    })
    @Expose()
    notifiesTeam: boolean;

    @ApiProperty({ example: 12 })
    @Expose()
    customerCount: number;

    @ApiProperty({ type: ActivityAdminWorkspaceResponseDto })
    @Expose()
    @Type(() => ActivityAdminWorkspaceResponseDto)
    workspace: ActivityAdminWorkspaceResponseDto;

    @ApiProperty({ example: new Date('2026-10-01T05:57:59.265Z') })
    @Expose()
    createdAt: Date;

    @ApiPropertyOptional({ example: new Date('2026-10-02T01:15:36.079Z') })
    @Expose()
    updatedAt?: Date;
}

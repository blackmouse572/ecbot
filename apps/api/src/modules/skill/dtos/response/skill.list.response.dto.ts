import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';
import { ENUM_SKILL_STATUS } from 'src/modules/skill/enums/skill-status.enum';

export class SkillListResponseDto extends DatabaseDto {
    @ApiProperty({ example: 'Refund policy' })
    @Expose()
    name: string;

    @ApiProperty({ example: 'refund-policy' })
    @Expose()
    slug: string;

    @ApiProperty({
        required: false,
        example: 'Tribuo tamdiu possimus abutor subiungo abeo harum.',
    })
    @Expose()
    description?: string;

    @ApiProperty({ enum: ENUM_SKILL_STATUS, example: ENUM_SKILL_STATUS.ACTIVE })
    @Expose()
    status: ENUM_SKILL_STATUS;

    @ApiProperty({
        description: 'True for Ecbot builtin skills (not workspace-owned)',
        example: false,
    })
    @Expose()
    isBuiltin: boolean;

    @ApiProperty({
        required: false,
        description: 'Owning workspace id (absent for builtin skills)',
    })
    @Expose()
    workspaceId?: string;

    @ApiProperty({
        required: false,
        description: 'Owning workspace name (absent for builtin skills)',
    })
    @Expose()
    workspaceName?: string;
}

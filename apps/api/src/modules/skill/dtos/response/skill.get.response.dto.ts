import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { SkillListResponseDto } from 'src/modules/skill/dtos/response/skill.list.response.dto';

export class SkillGetResponseDto extends SkillListResponseDto {
    @ApiProperty({
        description: 'Full skill instructions (markdown), loaded from S3',
        example: '# Refund policy\n\nWhen the customer asks for a refund...',
    })
    @Expose()
    instructions: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ENUM_TOOL_KIND } from 'src/modules/tool/enums/tool-kind.enum';
import { ENUM_TOOL_STATUS } from 'src/modules/tool/enums/tool-status.enum';

export class ChatbotToolListResponseDto {
    @Expose()
    @ApiProperty()
    id!: string;

    @Expose()
    @ApiProperty({ enum: ENUM_TOOL_KIND })
    kind!: ENUM_TOOL_KIND;

    @Expose()
    @ApiProperty()
    name!: string;

    @Expose()
    @ApiPropertyOptional()
    description?: string;

    @Expose()
    @ApiProperty({ enum: ENUM_TOOL_STATUS })
    status!: ENUM_TOOL_STATUS;

    @Expose()
    @ApiProperty({ type: [String], nullable: true })
    enabledActions!: string[] | null;
}

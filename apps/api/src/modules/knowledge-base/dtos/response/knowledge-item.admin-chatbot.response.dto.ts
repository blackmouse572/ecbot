import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class KnowledgeItemAdminChatbotResponseDto {
    @ApiProperty({ example: '7c1f2a3e-5b9d-4e8f-a1c2-3d4e5f6a7b8c' })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Trợ lý bán hàng' })
    @Expose()
    name: string;
}

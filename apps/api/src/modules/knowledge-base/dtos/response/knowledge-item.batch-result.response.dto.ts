import { ApiProperty } from '@nestjs/swagger';
import { BatchResultResponseDto } from '@app/common/batch/dtos/batch.response.dto';

export class KnowledgeItemBatchResultResponseDto extends BatchResultResponseDto {
    @ApiProperty({
        description:
            'True when a filter matched more items than one request acts on, so the rest were left out.',
    })
    truncated: boolean;
}

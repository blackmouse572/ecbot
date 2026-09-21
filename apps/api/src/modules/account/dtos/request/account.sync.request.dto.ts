import { ApiProperty } from '@nestjs/swagger';

export class SyncAccountRequestDto {
    @ApiProperty()
    code: string;
}

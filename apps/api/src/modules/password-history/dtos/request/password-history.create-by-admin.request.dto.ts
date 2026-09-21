import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';
import { PasswordHistoryCreateRequestDto } from 'src/modules/password-history/dtos/request/password-history.create.request.dto';

export class PasswordHistoryCreateByAdminRequestDto extends PasswordHistoryCreateRequestDto {
    @ApiProperty({
        example: 'a314279a-b59f-4abc-9745-0ada1e5c914b',
        required: true,
    })
    @IsNotEmpty()
    @IsUUID()
    by: string;
}

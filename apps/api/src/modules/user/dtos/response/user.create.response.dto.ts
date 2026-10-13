import { ApiProperty } from '@nestjs/swagger';
import { DatabaseIdResponseDto } from 'src/common/database/dtos/response/database.id.response.dto';

export class UserCreateResponseDto extends DatabaseIdResponseDto {
    @ApiProperty({
        required: true,
        description: 'Temporary password, shown to the admin once',
        example: 'aB3$kL9!xQ',
    })
    password: string;
}

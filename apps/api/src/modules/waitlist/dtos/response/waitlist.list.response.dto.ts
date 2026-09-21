import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { DatabaseDto } from 'src/common/database/dtos/database.dto';

export class WaitlistListResponseDto extends DatabaseDto {
    @ApiProperty({ required: true, example: 'Aimee.Quitzon68@hotmail.com' })
    email: string;

    @ApiProperty({ required: false, example: 'hero' })
    source?: string;

    @ApiProperty({ required: false, example: 'vi' })
    locale?: string;

    @ApiHideProperty()
    @Exclude()
    deletedAt?: Date;
}

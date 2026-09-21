import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { EmailWorkerDto } from 'src/modules/email/dtos/email.worker.dto';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';

export class EmailTaskDto extends EmailWorkerDto {
    @ApiProperty({ enum: ENUM_SEND_EMAIL_PROCESS, required: true })
    @IsEnum(ENUM_SEND_EMAIL_PROCESS)
    jobName: ENUM_SEND_EMAIL_PROCESS;
}

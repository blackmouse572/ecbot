import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsNotEmptyObject,
    IsObject,
    IsOptional,
    ValidateNested,
} from 'class-validator';
import { EmailSendDto } from 'src/modules/email/dtos/email.send.dto';

export class EmailWorkerDto {
    @ApiProperty({
        required: true,
        type: EmailSendDto,
        oneOf: [{ $ref: getSchemaPath(EmailSendDto) }],
    })
    @IsObject()
    @IsNotEmpty()
    @IsNotEmptyObject()
    @ValidateNested()
    @Type(() => EmailSendDto)
    send: EmailSendDto;

    // Shape varies by jobName (see EmailTaskController's switch) — no single
    // class to @Type()/@ValidateNested() against, and the global ValidationPipe's
    // forbidUnknownValues:true rejects a @ValidateNested() plain object that has
    // no matching @Type() target ("an unknown value was passed to the validate
    // function"). Loose IsObject/IsNotEmptyObject checks are enough here; the
    // controller's per-branch `dto.data as any` cast carries the real type gap.
    @ApiProperty({
        required: false,
    })
    @IsObject()
    @IsOptional()
    @IsNotEmptyObject()
    data?: Record<string, any>;
}

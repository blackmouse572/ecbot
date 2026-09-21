import { ApiProperty } from '@nestjs/swagger';
import { IsDefined, IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS } from '../constants/customer-tag-classifier.constant';

export class CustomerTagClassifierTaskDto {
    @ApiProperty({ enum: ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS, required: true })
    @IsDefined()
    @IsEnum(ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS)
    jobName: ENUM_CUSTOMER_TAG_CLASSIFIER_PROCESS;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    conversationId: string;

    @ApiProperty({ required: true })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    snapshotKey: string;
}

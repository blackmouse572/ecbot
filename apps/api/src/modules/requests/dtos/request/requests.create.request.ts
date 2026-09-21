import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
    IsDefined,
    IsEnum,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    MinLength,
} from 'class-validator';
import { REQUEST_TYPE } from '../../constant/requests.constant';

export class RequestCreateDto {
    @ApiProperty({
        example: REQUEST_TYPE.JOIN_WORKSPACE,
        enum: REQUEST_TYPE,
        description: 'Type of the request',
        required: true,
        type: String,
    })
    @IsEnum(REQUEST_TYPE)
    @IsNotEmpty()
    @IsDefined()
    @Type(() => String)
    readonly type: REQUEST_TYPE;

    @ApiProperty({
        example: 'bb395ceb-61ac-4f7d-ac95-d3ecc089c06f',
        description: 'ID of the person whose request is being made',
        type: String,
    })
    @IsNotEmpty()
    @IsDefined()
    readonly requestTo: string;

    @IsObject()
    @IsOptional()
    readonly payload?: Record<string, any>;

    @ApiProperty({
        example:
            'Khách hàng phản ánh đơn hàng giao chậm 3 ngày, cần hỗ trợ kiểm tra và phản hồi sớm.',
        description: 'ID of the user making the request',
        required: false,
        type: String,
    })
    @IsString()
    @IsOptional()
    @MinLength(1)
    readonly reason?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { REQUEST_STATUS } from '../../constant/requests.constant';

// Requester meta shown on the join-requests screen. Deliberately narrower than
// UserMetaResponseDto — only what the list needs.
export class RequestUserResponseDto {
    @ApiProperty({
        example: '8519a6e3-9ef2-4054-a865-4644bc8650cb',
        required: true,
    })
    @Expose()
    id: string;

    @ApiProperty({ example: 'Grace Johnson', required: true })
    @Expose()
    name: string;

    @ApiProperty({ example: 'Delphia37@yahoo.com', required: true })
    @Expose()
    email: string;
}

export class RequestListResponseDto {
    @ApiProperty({
        example: 'bf3d8550-6aee-4cc6-be65-a7968f43a8bc',
        required: true,
    })
    @Expose()
    id: string;

    @ApiProperty({
        example: 'I want to help support customers',
        required: false,
    })
    @Expose()
    reason?: string;

    @ApiProperty({ enum: REQUEST_STATUS, example: REQUEST_STATUS.PENDING })
    @Expose()
    status: REQUEST_STATUS;

    @ApiProperty({ example: '2026-08-30T11:49:31.461Z' })
    @Expose()
    @Transform(({ value }) => value?.toISOString?.() ?? value)
    createdAt: string;

    @ApiProperty({ type: RequestUserResponseDto })
    @Expose()
    @Type(() => RequestUserResponseDto)
    requestFrom: RequestUserResponseDto;
}

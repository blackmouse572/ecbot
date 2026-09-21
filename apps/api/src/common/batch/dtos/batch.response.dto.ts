import { ApiProperty } from '@nestjs/swagger';

export class BatchFailureDto {
    @ApiProperty({ description: 'Id that could not be processed.' })
    id: string;

    @ApiProperty({
        description:
            'Localization key of the error raised for this id, e.g. "tool.delete.error.referenced".',
    })
    reason: string;
}

export class BatchResultResponseDto {
    @ApiProperty({ type: [String], description: 'Ids processed successfully.' })
    succeeded: string[];

    @ApiProperty({ type: [BatchFailureDto], description: 'Ids that failed.' })
    failed: BatchFailureDto[];
}

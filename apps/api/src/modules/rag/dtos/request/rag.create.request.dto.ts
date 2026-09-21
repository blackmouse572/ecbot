import { AwsS3Dto } from '@app/modules/aws/dtos/aws.s3.dto';
import { ApiProperty } from '@nestjs/swagger';

export class RAGCreateRequestDto {
    @ApiProperty({
        required: true,
        type: String,
        description: 'The ID of the chatbot',
    })
    chatbot: string;

    @ApiProperty({
        required: true,
        type: String,
        description: 'The ID of the workspace',
    })
    workspace: string;

    @ApiProperty({
        required: true,
        description: 'The ID of the attachment',
    })
    attachment: AwsS3Dto;
}

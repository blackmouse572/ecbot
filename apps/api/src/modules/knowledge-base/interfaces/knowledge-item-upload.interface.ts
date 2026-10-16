import { AwsS3Entity } from '../../aws/repository/entities/aws.s3.entity';

export interface IKnowledgeItemStoredFile {
    attachment: AwsS3Entity;
    metadata: { fileName: string; mimeType: string };
}

export interface IKnowledgeItemUploadUrl {
    uploadUrl: string;
    fileKey: string;
    mimeType: string;
    expiresIn: number;
}

import { AwsS3Entity } from '@app/modules/aws/repository/entities/aws.s3.entity';
import { RAGEntity } from '../repository/entities/rag.entity';

export interface IRAGDoc extends Omit<RAGEntity, 'attachment'> {
    attachment: AwsS3Entity;
}

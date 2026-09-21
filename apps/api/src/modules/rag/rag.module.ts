import { PaginationModule } from '@app/common/pagination/pagination.module';
import { ActivityModule } from '@app/modules/activity/activity.module';
import { AwsModule } from '@app/modules/aws/aws.module';
import { Module } from '@nestjs/common';
import { RAGRepositoryModule } from './repository/rag.repository.module';
import { RAGService } from './services/rag.service';

@Module({
    providers: [RAGService],
    exports: [RAGService],
    imports: [RAGRepositoryModule, AwsModule, PaginationModule, ActivityModule],
})
export class RAGModule {}

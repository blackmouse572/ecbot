import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { RAGEntity } from './entities/rag.entity';
import { RAGRepository } from './repositories/rag.repository';

@Module({
    providers: [RAGRepository],
    exports: [RAGRepository],
    controllers: [],
    imports: [MikroOrmModule.forFeature([RAGEntity])],
})
export class RAGRepositoryModule {}

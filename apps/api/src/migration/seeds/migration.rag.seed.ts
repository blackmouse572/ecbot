import { AwsS3Entity } from '@app/modules/aws/repository/entities/aws.s3.entity';
import { ChatbotEntity } from '@app/modules/chatbot/repository/entities/chatbot.entity';
import { ENUM_RAG_STATUS } from '@app/modules/rag/enums/rag.status.enum';
import { RAGEntity } from '@app/modules/rag/repository/entities/rag.entity';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { faker } from '@faker-js/faker';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MigrationRAGSeed {
    constructor(private readonly em: EntityManager) {}

    async run(): Promise<void> {
        // Get existing workspaces and chatbots
        const workspaces = await this.em.find(
            WorkspaceEntity,
            {},
            { limit: 5 }
        );
        const chatbots = await this.em.find(ChatbotEntity, {}, { limit: 5 });

        if (workspaces.length === 0 || chatbots.length === 0) {
            console.log(
                '⚠️  Skipping RAG seeding - requires workspaces and chatbots'
            );
            return;
        }

        const rags: Partial<RAGEntity>[] = [];

        // Create completed RAG documents
        for (let i = 0; i < 4; i++) {
            const workspace = faker.helpers.arrayElement(workspaces);
            const chatbot = faker.helpers.arrayElement(chatbots);
            const filename = faker.system.fileName({ extensionCount: 1 });
            const extension = filename.split('.').pop() || 'pdf';

            const attachment = new AwsS3Entity();
            attachment.bucket = 'rag-documents';
            attachment.key = `rag/${workspace.id}/${chatbot.id}/${faker.string.uuid()}.${extension}`;
            attachment.completedUrl = `https://s3.example.com/rag-documents/${attachment.key}`;
            attachment.cdnUrl = `https://cdn.example.com/${attachment.key}`;
            attachment.mime = faker.helpers.arrayElement([
                'application/pdf',
                'text/plain',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            ]);
            attachment.extension = extension;
            attachment.size = faker.number.float({
                min: 0.1,
                max: 10.5,
                fractionDigits: 2,
            });

            rags.push({
                attachment: attachment,
                chatbot: chatbot,
                workspace: workspace,
                status: ENUM_RAG_STATUS.COMPLETED,
                embedding: Array.from({ length: 1536 }, () =>
                    faker.number.float({ min: -1, max: 1, fractionDigits: 6 })
                ),
                errorCode: null,
                errorMessage: null,
            });
        }

        // Create in-progress RAG documents
        for (let i = 0; i < 2; i++) {
            const workspace = faker.helpers.arrayElement(workspaces);
            const chatbot = faker.helpers.arrayElement(chatbots);
            const filename = faker.system.fileName({ extensionCount: 1 });
            const extension = filename.split('.').pop() || 'pdf';

            const attachment = new AwsS3Entity();
            attachment.bucket = 'rag-documents';
            attachment.key = `rag/${workspace.id}/${chatbot.id}/${faker.string.uuid()}.${extension}`;
            attachment.completedUrl = `https://s3.example.com/rag-documents/${attachment.key}`;
            attachment.cdnUrl = null;
            attachment.mime = faker.helpers.arrayElement([
                'application/pdf',
                'text/plain',
            ]);
            attachment.extension = extension;
            attachment.size = faker.number.float({
                min: 0.1,
                max: 5.0,
                fractionDigits: 2,
            });

            rags.push({
                attachment: attachment,
                chatbot: chatbot,
                workspace: workspace,
                status: ENUM_RAG_STATUS.IN_PROGRESS,
                embedding: null,
                errorCode: null,
                errorMessage: null,
            });
        }

        // Create failed RAG documents
        for (let i = 0; i < 2; i++) {
            const workspace = faker.helpers.arrayElement(workspaces);
            const chatbot = faker.helpers.arrayElement(chatbots);
            const filename = faker.system.fileName({ extensionCount: 1 });
            const extension = filename.split('.').pop() || 'pdf';

            const attachment = new AwsS3Entity();
            attachment.bucket = 'rag-documents';
            attachment.key = `rag/${workspace.id}/${chatbot.id}/${faker.string.uuid()}.${extension}`;
            attachment.completedUrl = `https://s3.example.com/rag-documents/${attachment.key}`;
            attachment.cdnUrl = null;
            attachment.mime = faker.helpers.arrayElement([
                'application/pdf',
                'text/plain',
                'image/png',
            ]);
            attachment.extension = extension;
            attachment.size = faker.number.float({
                min: 0.1,
                max: 20.0,
                fractionDigits: 2,
            });

            rags.push({
                attachment: attachment,
                chatbot: chatbot,
                workspace: workspace,
                status: ENUM_RAG_STATUS.FAILED,
                embedding: null,
                errorCode: faker.helpers.arrayElement([
                    400, 413, 415, 500, 503,
                ]),
                errorMessage: faker.helpers.arrayElement([
                    'Document parsing failed',
                    'File too large for processing',
                    'Unsupported file format',
                    'Embedding generation failed',
                    'Service temporarily unavailable',
                ]),
            });
        }

        // Create pending RAG documents
        for (let i = 0; i < 1; i++) {
            const workspace = faker.helpers.arrayElement(workspaces);
            const chatbot = faker.helpers.arrayElement(chatbots);
            const filename = faker.system.fileName({ extensionCount: 1 });
            const extension = filename.split('.').pop() || 'pdf';

            const attachment = new AwsS3Entity();
            attachment.bucket = 'rag-documents';
            attachment.key = `rag/${workspace.id}/${chatbot.id}/${faker.string.uuid()}.${extension}`;
            attachment.completedUrl = `https://s3.example.com/rag-documents/${attachment.key}`;
            attachment.cdnUrl = null;
            attachment.mime = 'application/pdf';
            attachment.extension = extension;
            attachment.size = faker.number.float({
                min: 0.1,
                max: 3.0,
                fractionDigits: 2,
            });

            rags.push({
                attachment: attachment,
                chatbot: chatbot,
                workspace: workspace,
                status: ENUM_RAG_STATUS.PENDING,
                embedding: null,
                errorCode: null,
                errorMessage: null,
            });
        }

        // Save all RAG documents
        for (const ragData of rags) {
            const rag = this.em.create(RAGEntity, ragData);
            this.em.persist(rag);
        }

        await this.em.flush();
        console.log(`✅ Seeded ${rags.length} RAG documents`);
    }
}

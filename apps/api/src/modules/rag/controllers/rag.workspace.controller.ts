import {
    PaginationQuery,
    PaginationQueryFilterInEnum,
} from '@app/common/pagination/decorators/pagination.decorator';
import { PaginationListDto } from '@app/common/pagination/dtos/pagination.list.dto';
import { PaginationService } from '@app/common/pagination/services/pagination.service';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { ApiKeyProtected } from '@app/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from '@app/modules/auth/decorators/auth.jwt.decorator';
import { AwsS3PresignResponseDto } from '@app/modules/aws/dtos/response/aws.s3-presign.response.dto';
import { ENUM_AWS_S3_ACCESSIBILITY } from '@app/modules/aws/enums/aws.enum';
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import {
    WorkspaceMemberOrOwnerProtected,
    WorkspacePayload,
    WorkspacePolicyAbilityProtected,
} from '@app/modules/workspace/decorators/workspace.decorator';
import { WorkspaceEntity } from '@app/modules/workspace/repository/entities/workspace.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import {
    Response,
    ResponsePaging,
} from 'src/common/response/decorators/response.decorator';
import {
    IResponse,
    IResponsePaging,
} from 'src/common/response/interfaces/response.interface';
import { RAG_SEARCHABLE_FIELDS } from '../constants/rag.doc.constant';
import {
    RAGCreateWithFileDoc,
    RAGDeleteDoc,
    RAGGetDoc,
    RAGListDoc,
    RAGUploadFileDoc,
} from '../docs/rag.workspace.doc';
import { RAGCreateWithFileRequestDto } from '../dtos/request/rag.create-with-file.request.dto';
import { RAGUploadFileRequestDto } from '../dtos/request/rag.upload-file.request.dto';
import { RAGGetResponseDto } from '../dtos/response/rag.get.response.dto';
import { RAGListByChatbotResponseDto } from '../dtos/response/rag.list.response.dto';
import { ENUM_RAG_STATUS_CODE_ERROR } from '../enums/rag.status-code.enum';
import { ENUM_RAG_STATUS } from '../enums/rag.status.enum';
import { RAGService } from '../services/rag.service';

@ApiTags('modules.workspace.rag')
@Controller({
    version: '1',
    path: '/:workspace/:chatbot/rag',
})
export class RAGWorkspaceController {
    constructor(
        private readonly ragService: RAGService,
        private readonly awsS3Service: AwsS3Service,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService,
        private readonly em: EntityManager
    ) {}

    @RAGListDoc()
    @ResponsePaging('rag.list')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.RAG,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async findAll(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('chatbot') chatbotId: string,
        @PaginationQuery({
            availableSearch: RAG_SEARCHABLE_FIELDS,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum('status', null, ENUM_RAG_STATUS)
        status?: Record<string, any>
    ): Promise<IResponsePaging<RAGListByChatbotResponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            workspace: workspace.id,
            chatbot: chatbotId,
            deletedAt: null,
            ...(status ? status : {}),
        };

        const rags = await this.ragService.findAllWithChatbotAndAttachment(
            find,
            {
                paging: {
                    limit: _limit,
                    offset: _offset,
                },
                order: _order,
            }
        );
        const total: number = await this.ragService.getTotal(find);
        const totalPage: number = this.paginationService.totalPage(
            total,
            _limit
        );

        const mapped: RAGListByChatbotResponseDto[] = rags.map(rag =>
            this.ragService.mapList(rag)
        );

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @RAGGetDoc()
    @Response('rag.get')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.RAG,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:rag')
    async findOne(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('chatbot') chatbotId: string,
        @Param('rag') ragId: string
    ): Promise<IResponse<RAGGetResponseDto>> {
        const rag = await this.ragService.findOne({
            _id: ragId,
            workspace: workspace.id,
            chatbot: chatbotId,
            deletedAt: null,
        });

        if (!rag) {
            throw new NotFoundException({
                statusCode: ENUM_RAG_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'rag.error.notFound',
            });
        }

        const mapped: RAGGetResponseDto = this.ragService.mapGet(rag);
        return { data: mapped };
    }

    @RAGUploadFileDoc()
    @Response('rag.uploadFile')
    @WorkspaceMemberOrOwnerProtected()
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/upload-file')
    async uploadFile(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('chatbot') chatbotId: string,
        @Body() payload: RAGUploadFileRequestDto
    ): Promise<IResponse<AwsS3PresignResponseDto>> {
        const randomFilename: string = this.ragService.generateS3Key(
            chatbotId,
            workspace.id,
            payload
        );
        try {
            const aws: AwsS3PresignResponseDto =
                await this.awsS3Service.presignPutItem(
                    randomFilename,
                    payload.size,
                    {
                        access: ENUM_AWS_S3_ACCESSIBILITY.PUBLIC,
                        expired: 900, // 15 minutes
                    }
                );
            return {
                data: aws,
            };
        } catch (err: unknown) {
            console.log({ err });
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @RAGCreateWithFileDoc()
    @Response('rag.create')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.RAG,
        action: [ENUM_POLICY_ACTION.CREATE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Post('/create-with-file')
    async createWithFile(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('chatbot') chatbotId: string,
        @Body() body: RAGCreateWithFileRequestDto,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<IResponse<RAGGetResponseDto>> {
        // Validate that the chatbot ID in the body matches the param
        if (body.chatbot !== chatbotId) {
            throw new NotFoundException({
                statusCode: ENUM_RAG_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'chatbot.error.notFound',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            const attachment = this.awsS3Service.mapPresign(body.attachment);
            const created = await this.ragService.create(
                {
                    chatbot: chatbotId,
                    workspace: workspace.id,
                    attachment,
                },
                user,
                { em: session }
            );

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.CREATE,
                    subject: ENUM_POLICY_SUBJECT.RAG,
                    metadata: {
                        chatbot: chatbotId,
                        workspace: workspace.id,
                        attachment: body.attachment,
                    },
                },
                { em: session }
            );

            await session.commit();

            const mapped: RAGGetResponseDto = this.ragService.mapGet(created);
            return { data: mapped };
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }
    }

    @RAGDeleteDoc()
    @Response('rag.delete')
    @WorkspacePolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.RAG,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:rag')
    async delete(
        @WorkspacePayload() workspace: WorkspaceEntity,
        @Param('chatbot') chatbotId: string,
        @Param('rag') id: string,
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity
    ): Promise<void> {
        const rag = await this.ragService.findOne({
            _id: id,
            workspace: workspace.id,
            chatbot: chatbotId,
            deletedAt: null,
        });

        if (!rag) {
            throw new NotFoundException({
                statusCode: ENUM_RAG_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'rag.error.notFound',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            await this.ragService.softDelete(rag, {
                em: session,
                actionBy: user.id,
            });
            const ragWithAttachment = await this.ragService.joinAttachment(rag);
            await this.awsS3Service.deleteItem(
                ragWithAttachment.attachment.key
            );
            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.RAG,
                    metadata: {
                        chatbot: chatbotId,
                        workspace: workspace.id,
                        ragId: id,
                        // RAG entities don't store an original filename - the
                        // S3 key's basename is the best available display name.
                        name: rag.attachment.key.split('/').pop(),
                    },
                },
                { em: session }
            );

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        return;
    }
}

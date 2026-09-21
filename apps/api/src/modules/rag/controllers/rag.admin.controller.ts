import {
    PaginationQuery,
    PaginationQueryFilterEqual,
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
import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import {
    PolicyAbilityProtected,
    PolicyRoleProtected,
} from '@app/modules/policy/decorators/policy.decorator';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from '@app/modules/policy/enums/policy.enum';
import { UserProtected } from '@app/modules/user/decorators/user.decorator';
import { UserParsePipe } from '@app/modules/user/pipes/user.parse.pipe';
import { UserEntity } from '@app/modules/user/repository/entities/user.entity';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    Controller,
    Delete,
    Get,
    InternalServerErrorException,
    NotFoundException,
    Param,
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
    RAGAdminDeleteDoc,
    RAGAdminGetDoc,
    RAGAdminListDoc,
} from '../docs/rag.admin.doc';
import { RAGGetResponseDto } from '../dtos/response/rag.get.response.dto';
import { RAGAdminListReponseDto } from '../dtos/response/rag.list.response.dto';
import { ENUM_RAG_STATUS_CODE_ERROR } from '../enums/rag.status-code.enum';
import { ENUM_RAG_STATUS } from '../enums/rag.status.enum';
import { RAGEntity } from '../repository/entities/rag.entity';
import { RAGService } from '../services/rag.service';

@ApiTags('modules.admin.rag')
@Controller({
    version: '1',
    path: '/rag',
})
export class RAGAdminController {
    constructor(
        private readonly ragService: RAGService,
        private readonly awsS3Service: AwsS3Service,
        private readonly paginationService: PaginationService,
        private readonly activityService: ActivityService,
        private readonly em: EntityManager
    ) {}

    @RAGAdminListDoc()
    @ResponsePaging('rag.list')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.RAG,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/')
    async findAll(
        @PaginationQuery({
            availableSearch: RAG_SEARCHABLE_FIELDS,
        })
        { _search, _limit, _offset, _order }: PaginationListDto,
        @PaginationQueryFilterInEnum('status', null, ENUM_RAG_STATUS)
        status?: Record<string, any>,
        @PaginationQueryFilterEqual('workspace')
        workspace?: Record<string, any>,
        @PaginationQueryFilterEqual('chatbot')
        chatbot?: Record<string, any>
    ): Promise<IResponsePaging<RAGAdminListReponseDto>> {
        const find: Record<string, any> = {
            ..._search,
            deletedAt: null,
            ...(status ? status : {}),
            ...(workspace ? workspace : {}),
            ...(chatbot ? chatbot : {}),
        };

        const rags: RAGEntity[] = await this.ragService.findAllWithJoined(
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

        const mapped = rags.map(rag => this.ragService.mapGet(rag));

        return {
            _pagination: { total, totalPage },
            data: mapped,
        };
    }

    @RAGAdminGetDoc()
    @Response('rag.get')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.RAG,
        action: [ENUM_POLICY_ACTION.READ],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/:rag')
    async findOne(
        @Param('rag') id: string
    ): Promise<IResponse<RAGGetResponseDto>> {
        const rag: RAGEntity = await this.ragService.findOneById(id, {
            populate: ['attachment', 'chatbot', 'workspace'],
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

    @RAGAdminDeleteDoc()
    @Response('rag.delete')
    @PolicyAbilityProtected({
        subject: ENUM_POLICY_SUBJECT.RAG,
        action: [ENUM_POLICY_ACTION.DELETE],
    })
    @PolicyRoleProtected(ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN)
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Delete('/:rag')
    async delete(
        @AuthJwtPayload('user', UserParsePipe) user: UserEntity,
        @Param('rag') id: string
    ): Promise<void> {
        const rag: RAGEntity = await this.ragService.findOneById(id);

        if (!rag) {
            throw new NotFoundException({
                statusCode: ENUM_RAG_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'rag.error.notFound',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            // Permanently delete the RAG entry
            await this.ragService.delete([{ rag }], { em: session });
            const ragWithAttachment = await this.ragService.joinAttachment(rag);
            await this.awsS3Service.deleteItem(
                ragWithAttachment.attachment.key
            );
            // Log the deletion activity
            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.DELETE,
                    subject: ENUM_POLICY_SUBJECT.RAG,
                    metadata: {
                        ragId: rag.id,
                        // RAG entities don't store an original filename - the
                        // S3 key's basename is the best available display name.
                        name: rag.attachment.key.split('/').pop(),
                        ragStatus: rag.status,
                        workspace: rag.workspace,
                        chatbot: rag.chatbot,
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

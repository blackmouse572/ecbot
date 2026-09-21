import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseSaveOptions,
} from '@app/common/database/interfaces/database.interface';
import { ChatbotCreateRequestDto } from '../dtos/request/chatbot.create.request.dto';
import { CloneChatbotRequestDto } from '../dtos/request/chatbot.clone.request.dto';
import { ChatbotUpdateRequestDto } from '../dtos/request/chatbot.update.request.dto';
import { ChatbotListResponseDto } from '../dtos/response/chatbot.list.response.dto';

import { IChatbotDoc, IChatbotEntity } from './chatbot.interface';

export interface IChatbotService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<IChatbotDoc[]>;

    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;

    findOneById(_id: string, options?: IDatabaseOptions): Promise<IChatbotDoc>;

    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<IChatbotDoc>;

    create(
        createDto: ChatbotCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<IChatbotDoc>;

    update(
        repository: IChatbotDoc,
        updateDto: ChatbotUpdateRequestDto,
        options?: IDatabaseSaveOptions
    ): Promise<IChatbotDoc>;

    softDelete(
        repository: IChatbotDoc,
        options?: IDatabaseSaveOptions
    ): Promise<IChatbotDoc>;

    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;

    mapList(
        chatbots: IChatbotDoc[] | IChatbotEntity[]
    ): ChatbotListResponseDto[];

    active(
        repository: IChatbotDoc,
        options?: IDatabaseSaveOptions
    ): Promise<boolean>;

    inactive(
        repository: IChatbotDoc,
        options?: IDatabaseSaveOptions
    ): Promise<boolean>;

    archive(
        repository: IChatbotDoc,
        options?: IDatabaseSaveOptions
    ): Promise<boolean>;

    unarchive(
        repository: IChatbotDoc,
        options?: IDatabaseSaveOptions
    ): Promise<boolean>;

    linkBatchAccounts(
        chatbot: IChatbotDoc,
        accountIds: string[],
        options?: IDatabaseSaveOptions
    ): Promise<IChatbotDoc>;

    unlinkBatchAccounts(
        chatbot: IChatbotDoc,
        accountIds: string[],
        options?: IDatabaseSaveOptions
    ): Promise<IChatbotDoc>;

    clone(
        sourceId: string,
        workspaceId: string,
        dto: CloneChatbotRequestDto,
        options?: IDatabaseSaveOptions & { actionBy?: string }
    ): Promise<IChatbotDoc>;
}

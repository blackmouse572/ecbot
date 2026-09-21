import { Request } from 'express';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseGetTotalOptions,
    IDatabaseOptions,
    IDatabaseUpdateManyOptions,
} from 'src/common/database/interfaces/database.interface';
import { SessionCreateRequestDto } from 'src/modules/session/dtos/request/session.create.request.dto';
import { SessionAdminListResponseDto } from 'src/modules/session/dtos/response/session.admin-list.response.dto';
import { SessionListResponseDto } from 'src/modules/session/dtos/response/session.list.response.dto';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export interface ISessionService {
    findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SessionEntity[]>;
    findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<SessionEntity[]>;
    findOneById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<SessionEntity | null>;
    findOne(
        find: Record<string, any>,
        options?: IDatabaseOptions
    ): Promise<SessionEntity>;
    findOneActiveById(
        _id: string,
        options?: IDatabaseOptions
    ): Promise<SessionEntity>;
    findOneActiveByIdAndUser(
        _id: string,
        user: string,
        options?: IDatabaseOptions
    ): Promise<SessionEntity>;
    getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    getTotalByUser(
        user: string,
        options?: IDatabaseGetTotalOptions
    ): Promise<number>;
    create(
        request: Request,
        { user }: SessionCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<SessionEntity>;
    mapList(
        userLogins: SessionEntity[] | SessionEntity[]
    ): SessionListResponseDto[];
    mapAdminList(
        sessions: SessionEntity[],
        currentSessionId?: string
    ): SessionAdminListResponseDto[];
    touchLastActive(id: string): Promise<void>;
    findLoginSession(_id: string): Promise<string>;
    setLoginSession(user: UserEntity, session: SessionEntity): Promise<void>;
    deleteLoginSession(_id: string): Promise<void>;
    processDeleteLoginSession(session: string): Promise<void>;
    resetLoginSession(): Promise<void>;
    updateRevoke(
        repository: SessionEntity,
        options?: IDatabaseOptions
    ): Promise<SessionEntity>;
    updateManyRevokeByUser(
        user: string,
        options?: IDatabaseUpdateManyOptions
    ): Promise<boolean>;
    deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean>;
}

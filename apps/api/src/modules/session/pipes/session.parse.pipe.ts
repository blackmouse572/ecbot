import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_SESSION_STATUS_CODE_ERROR } from 'src/modules/session/enums/session.status-code.enum';
import { SessionEntity } from 'src/modules/session/repository/entities/session.entity';
import { SessionService } from 'src/modules/session/services/session.service';

@Injectable()
export class SessionActiveParsePipe implements PipeTransform {
    constructor(private readonly sessionService: SessionService) {}

    async transform(value: string): Promise<SessionEntity> {
        const session = await this.sessionService.findOneActiveById(value);
        if (!session) {
            throw new NotFoundException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'session.error.notFound',
            });
        }

        return session;
    }
}

@Injectable()
export class SessionActiveByUserParsePipe implements PipeTransform {
    constructor(
        private readonly cls: ClsService,
        private readonly sessionService: SessionService
    ) {}

    async transform(value: string): Promise<SessionEntity> {
        const { user } = this.cls.get<IRequestApp>(CLS_REQ) ?? {};

        const session = await this.sessionService.findOneActiveByIdAndUser(
            value,
            user!.user
        );
        if (!session) {
            throw new NotFoundException({
                statusCode: ENUM_SESSION_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'session.error.notFound',
            });
        }

        return session;
    }
}
